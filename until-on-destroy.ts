import { Subscription } from 'rxjs';

const subSymbol: unique symbol = Symbol('subscription');
const decoratedSymbol: unique symbol = Symbol('decorated');

interface ClassWithSubscription {
  [subSymbol]?: Subscription;
}

type SubscriptionMethod = (...args: any[]) => Subscription;

const isIvy = (target: any) => target.constructor['ɵfac'];
const getIvyDef = (target: any) => target.constructor[['ɵcmp', 'ɵdir'].find(key => target.constructor[key])];


function markAsDecorated(target: any) {
  target[decoratedSymbol] = true;
}

function isDecorated(target: any) {
  return target.hasOwnProperty(decoratedSymbol);
}


function createMethodWrapper(originalMethod: SubscriptionMethod): SubscriptionMethod {
  return function (this: ClassWithSubscription, ...args: any[]) {
    const sub: Subscription = originalMethod.apply(this, args);
    this[subSymbol].add(sub);
    return sub;
  };
}

function wrapOneHook(target: any, hookName: string, wrappingFn: (this: ClassWithSubscription) => void): void {
  return isIvy(target)
    ? wrapOneHook__Ivy(target, hookName, wrappingFn)
    : wrapOneHook__ViewEngine(target, hookName, wrappingFn);
}

function decorateFunction(obj: object, fnName: string, wrappinFn: () => void) {
  const originalFn = obj[fnName];
  return function (): void {
    wrappinFn.call(this);

    if (originalFn) {
      originalFn.call(this);
    }
  };
}

function wrapOneHook__Ivy(target: any, hookName: string, wrappingFn: (this: ClassWithSubscription) => void): void {
  const ivyHookName = hookName.slice(0, 1).toLowerCase() + hookName.slice(1);
  const ivyDef: any = getIvyDef(target);

  ivyDef[ivyHookName] = decorateFunction(ivyDef, ivyHookName, wrappingFn);
}

function wrapOneHook__ViewEngine(target: any, hookName: string, wrappingFn: (this: ClassWithSubscription) => void): void {
  const veHookName = 'ng' + hookName;
  if (!target[veHookName]) {
    throw new Error(`You have to implements ${veHookName} in component/directive ${target.constructor.name}`);
  }

  target[veHookName] = decorateFunction(target, veHookName, wrappingFn);
}

function wrapHooks(target: ClassWithSubscription) {
  if (!isDecorated(target)) {
    markAsDecorated(target);
    wrapOneHook(target, 'OnInit', function () {
      this[subSymbol] = new Subscription();
    });
    wrapOneHook(target, 'OnDestroy', function () {
      this[subSymbol]?.unsubscribe();
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
