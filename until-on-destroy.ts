import {Subscription} from 'rxjs';

const subSymbol: unique symbol = Symbol('subscription');
const decoratedSymbol: unique symbol = Symbol('decorated');
const onInit: unique symbol = Symbol('onInit');
const onDestroy: unique symbol = Symbol('onDestroy');

interface ClassWithSubscription {
  [subSymbol]?: Subscription;
}

type SubscriptionMethod = (...args: any[]) => Subscription | Subscription[];

const isIvy = (target: any) => target.constructor.ɵfac;
const getIvyDef = (target: any) => target.constructor[['ɵcmp', 'ɵdir'].find(key => target.constructor[key])];


function markAsDecorated(target: any): void {
  target[decoratedSymbol] = true;
}

function isDecorated(target: any): boolean {
  return target.hasOwnProperty(decoratedSymbol);
}


function createMethodWrapper(originalMethod: SubscriptionMethod): SubscriptionMethod {
  return function(this: ClassWithSubscription, ...args: any[]): (Subscription | Subscription[]) {
    const sub: Subscription | Subscription[] = originalMethod.apply(this, args);
    if ((sub as Subscription)?.unsubscribe) {
      this[subSymbol].add(sub as Subscription);
    } else if (Array.isArray(sub)) {
      (sub as Subscription[]).forEach(s => this[subSymbol].add(s));
    } else {
      throw new Error('Decorated method must return Subscription or Subscription[]');
    }
    return sub;
  };
}

function wrapOneHook(target: any, hookName: string, oldName: symbol, wrappingFn: (this: ClassWithSubscription) => void): void {
  if (isIvy(target)) {
    wrapOneHook__Ivy(target, hookName, oldName, wrappingFn);
  }
  wrapOneHook__ViewEngine(target, hookName, oldName, wrappingFn);
}

function decorateFunction(obj: object, fnName: string, oldName: symbol, wrappingFn: () => void): () => void {
  obj[oldName] = obj[fnName];
  return function(): void {
    wrappingFn.call(this);

    if (obj[oldName]) {
      obj[oldName].call(this);
    }
  };
}

function wrapOneHook__Ivy(target: any, hookName: string, oldName: symbol, wrappingFn: (this: ClassWithSubscription) => void): void {
  const ivyHookName = hookName.slice(0, 1).toLowerCase() + hookName.slice(1);
  const ivyDef: any = getIvyDef(target);

  ivyDef[ivyHookName] = decorateFunction(ivyDef, ivyHookName, oldName, wrappingFn);
}

function wrapOneHook__ViewEngine(target: any, hookName: string, oldName: symbol, wrappingFn: (this: ClassWithSubscription) => void): void {
  const veHookName = 'ng' + hookName;
  if (!target[veHookName] && !isIvy(target)) {
    throw new Error(`You have to implements ${veHookName} in component/directive ${target.constructor.name}`);
  }

  target[veHookName] = decorateFunction(target, veHookName, oldName, wrappingFn);
}

function wrapHooks(target: ClassWithSubscription): void {
  if (!isDecorated(target)) {
    markAsDecorated(target);
    wrapOneHook(target, 'OnInit', onInit, function(): void {
      this[subSymbol] = new Subscription();
    });
    wrapOneHook(target, 'OnDestroy', onDestroy, function(): void {
      this[subSymbol].unsubscribe();
    });
  }
}


export function UntilOnDestroy<ClassType extends ClassWithSubscription>(): MethodDecorator {
  return function UntilOnDestroyDecorator(target: ClassType, propertyKey: string): TypedPropertyDescriptor<SubscriptionMethod> {
    wrapHooks(target);
    return {
      value: createMethodWrapper(target[propertyKey]),
    };
  } as MethodDecorator;
}
