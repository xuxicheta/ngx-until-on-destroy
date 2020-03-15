<h1>Angular: еще один способ отписываться</h1>

Конечно всего подписок в коде компонента следует избегать, перекладывая эту задачу на AsyncPipe, однако не всегда это возможно. Есть разные способы работать с подпиской, но все они сводятся к двум - ручная отписка или использование takeUntil.
Со временем я все чаще стал использовать свой декоратор для отписок. Мы рассмотрим как он устроен и научимся писать свои декораторы.

Основная идея состоит в том, что любая подписка должна быть возвращаемой из метода класса, т.е. все декорируемые методы должны иметь следующую сигнатуру

```javascript
(...args: any[]) => Subscription;
```

На метод можно сделать декоратор, который может что-то сделать с результатом.

Потребуется реализовать три операции.
1. При вызове ngOnInit должно быть создано некое хранилище подписок.
2. При вызове декорируемого метода, возвращающего подиску, эта подписка должна быть сохранена в хранилище.
3. При вызове ngOnDestroy все подписки из хранилища должны быть завершены (unsubscribe).

Напомню, как делается декоратор метода класса. Официальная документация находится тут 
http://www.typescriptlang.org/docs/handbook/decorators.html

Вот сигнатура декоратора:
```javascript
<T>(target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>) => TypedPropertyDescriptor<T> | void; 
```

Декоратор получает на вход конструктор класса, имя свойства и дескриптор. Дескриптор я опущу, для метода он не играет никакой роли, врядли кто-то будет модифицировать дескриптор для метода.
Часто делают функцию, возвращающую декоратор, вдруг со временем придется передать какой-то параметри, ну и вообще так проще читается.

Итак, 
```javascript
export function UntilOnDestroy<ClassType extends DirectiveWithSubscription>(): MethodDecorator {
  return function UntilOnDestroyDecorator(target: ClassType, propertyKey: string): TypedPropertyDescriptor<SubscriptionMethod> {
    wrapHooks(target);
    return {
      value: createMethodWrapper(target, target[propertyKey]),
    };
  } as MethodDecorator;
}
```

Декоратор состоит из двух частей, первая выполнится при декорировании метода, и в этот момент можно взять конструктор класса и изменить его, и вторая часть - в возвращаемом дескрипторе можно подменить метод любым желаемым кодом.

Забегая вперед, скажу что в роли хранилища будет выступать подписка (Subscription). Подписка позволяет добавлять в нее дочерние подписки с помощью метода `add`, метод `unsubscribe` завершает так же все дочерние подписки.
Документация тут https://rxjs.dev/api/index/class/Subscription

Подписка хранится в свойстве-символе, символ гарантирует уникальность имени свойства и отсутствие конфликтов с кем бы то ни было.
```javascript
const subSymbol = Symbol('until-on-destroy');

interface ClassWithSubscription {
  [subSymbol]?: Subscription;
}
```


Начнем с простой части, с подмены метода.
<h2>createMethodWrapper</h2>
Реализация пункта 2.

```javascript
function createMethodWrapper(target: ClassWithSubscription, originalMethod: SubscriptionMethod): SubscriptionMethod {
  return function(...args: any[]) {
    const sub: Subscription = originalMethod.apply(this, args);
    target[subSymbol].add(sub);
    return sub;
  };
}
```
Функция возвращает функцию-обертку, в которой сначала вызывается оригинальный метод, а затем результат выполнения метода (подписка) добавляется в хранилище. Тут возможны проблемы в случае отсутствия subSymbol, но я намеренно не обрабатываю ошибку, чтобы сразу заметить исключение.

<h2>wrapHooks</h2>
Реализация пунктов 1 и 3.

```javascript
function wrapHooks(target: ClassWithSubscription) {
  if (!target.hasOwnProperty(subSymbol)) {
    target[subSymbol] = null;
    wrapOneHook(target, 'OnInit', t => t[subSymbol] = new Subscription());
    wrapOneHook(target, 'OnDestroy', t => t[subSymbol].unsubscribe());
  }
}
```

Хуки должны быть обернуты только один раз, независимо от количество декорированных методов, поэтому вначале есть проверка на существование в классе свойства subSymbol.
Ну и собственно оборачивание хуков с добавлением функционала. Код для обертки будет отличаться только вносимыми изменениями, поэтому я сделал отдельный метод для создания обертки, чтобы не повторяться.

А вот тут начинается самое интересное. Дело в том, что с появлением Angular 9 стало невозможно просто подменить хуки в райнтайме, компилятор извлекает их заранее и помещает в фабрику класса. Придется разделить оборачивание хуков для ViewEngine и для Ivy

```javascript
const cmpKey = 'ɵcmp';

function wrapOneHook(target: any, hookName: string, wrappingFn: (target: ClassWithSubscription) => void): void {
  return target.constructor[cmpKey]
    ? wrapOneHook__Ivy(target, hookName, wrappingFn)
    : wrapOneHook__ViewEngine(target, hookName, wrappingFn);
}
```
`'ɵcmp'` это имя свойства, под которым компилятор Ivy хранит в конструкторе класса описание класса для фабрики. По нему можно отличать версии движка Angular.

Для ViewEngine все было просто

```javascript
function wrapOneHook__ViewEngine(target: any, hookName: string, wrappingFn: (target: ClassWithSubscription) => void): void {
  const veHookName = 'ng' + hookName;
  if (!target[veHookName]) {
    throw new Error(`You have to implements ${veHookName} in component ${target.constructor.name}`);
  }
  const originalHook: () => void = target[veHookName];
  target[veHookName] = function (): void {
    wrappingFn(target);
    originalHook.call(this);
  };
}
```

Надо было всегда следить, чтобы нужные хуки точно были объявлены в компоненте (или директиве), иначе они просто не будут вызваны.
Ну а затем обычная подмена хука с добавлением вызова коллбэка wrappingFn.

А вот для Ivy нужно подменять свойства компонента, которое добавляет движок Ivy. Это хак конечно, но пока легального способа я не знаю.
Зато не нужно требовать обязательных объявлений ngOnInit и ngOnDestroy.

```javascript
function wrapOneHook__Ivy(target: any, hookName: string, wrappingFn: (target: ClassWithSubscription) => void): void {
  const ivyHookName = hookName.slice(0, 1).toLowerCase() + hookName.slice(1);
  const componentDef: any = target.constructor[cmpKey];

  const originalHook: () => void = componentDef[ivyHookName];
  componentDef[ivyHookName] = function (): void {
    wrappingFn(target);

    if (originalHook) {
      originalHook.call(this);
    }
  };
}
```

Все тоже самое, только методы хуков для обертывания берем не из конструктора напрямую, а из componentDef.
Их имена немного отличаются, поэтому пришлось добавить немного работы со строками, чтобы сделать из OnInit в одном случае ngOnInit, а в другом onInit.

На этом все, пора опробовать декоратор в деле. 

<h2>Проверка</h2>
Создаем проект
```sh
ng new check
```
В нем один дочерний компонент
```sh
ng g c child
```
Со следующим содержимым.
Шаблон:
```html
<p>child: {{id}}</p>
```
компонент:
```javascript
@Component({
  selector: 'app-child',
  templateUrl: './child.component.html',
})
export class ChildComponent implements OnInit, OnDestroy {
  id: string;

  ngOnInit() {
    this.id = Math.random().toString().slice(-3);
    this.sub1();
    this.sub2();
  }

  ngOnDestroy() {}

  @UntilOnDestroy()
  sub1() {
    console.log(this.id, 'sub1 subscribe');
    return NEVER.pipe(
      finalize(() => console.log(this.id, 'sub1 unsubscribe'))
    )
      .subscribe()
  }

  sub2() {
    console.log(this.id, 'sub2 subscribe');
    return NEVER.pipe(
      finalize(() => console.log(this.id, 'sub2 unsubscribe'))
    )
      .subscribe()
  }
}
```

В шаблоне AppComponent будет просто
```html
<button #button (click)="button.toggle = !button.toggle">toggle</button>
<app-child *ngIf="button.toggle"></app-child>
```

При нажатии на toggle компонент app-child  инициализируется и дестроится. В консоли видно что подписка от декорированного sub1 корректно завершается, а от sub1 остается висеть.

Ссылка на stackblitz
https://stackblitz.com/edit/until-on-destroy-ve








