import { Subscription } from 'rxjs';

const subSymbol = Symbol('until-on-destroy');

interface ClassWithSubscription {
  [subSymbol]?: Subscription;
}

type SubscriptionMethod = (...args: any[]) => Subscription;

const cmpKey = 'ɵcmp';

function createMethodWrapper(target: ClassWithSubscription, originalMethod: SubscriptionMethod): SubscriptionMethod {
  return function (...args: any[]) {
    const sub: Subscription = originalMethod.apply(this, args);
    target[subSymbol].add(sub);
    return sub;
  };
}

function wrapOneHook(target: any, hookName: string, wrappingFn: (target: ClassWithSubscription) => void): void {
  return target.constructor[cmpKey]
    ? wrapOneHook__Ivy(target, hookName, wrappingFn)
    : wrapOneHook__ViewEngine(target, hookName, wrappingFn);
}

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

function wrapHooks(target: ClassWithSubscription) {
  if (!target.hasOwnProperty(subSymbol)) {
    target[subSymbol] = null;
    wrapOneHook(target, 'OnInit', t => t[subSymbol] = new Subscription());
    wrapOneHook(target, 'OnDestroy', t => t[subSymbol].unsubscribe());
  }
}


export function UntilOnDestroy<ClassType extends ClassWithSubscription>(): MethodDecorator {
  return function UntilOnDestroyDecorator(target: ClassType, propertyKey: string): TypedPropertyDescriptor<SubscriptionMethod> {
    wrapHooks(target);
    return {
      value: createMethodWrapper(target, target[propertyKey]),
    };
  } as MethodDecorator;
}
