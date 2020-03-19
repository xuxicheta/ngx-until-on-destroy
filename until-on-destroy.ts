import { Subscription } from 'rxjs';

const subSymbol = Symbol('until-on-destroy');

interface ClassWithSubscription {
  [subSymbol]?: Subscription;
}

type SubscriptionMethod = (...args: any[]) => Subscription;

const keys = ['ɵcmp', 'ɵprov', 'ɵdir', 'ɵpipe'];
const getIvyDef = (target: any) => target.constructor[keys.find(key => target.constructor[key])];


function createMethodWrapper(target: ClassWithSubscription, originalMethod: SubscriptionMethod): SubscriptionMethod {
  return function (...args: any[]) {
    const sub: Subscription = originalMethod.apply(this, args);
    target[subSymbol].add(sub);
    return sub;
  };
}

function wrapOneHook(target: any, hookName: string, wrappingFn: (target: ClassWithSubscription) => void): void {
  return getIvyDef(target)
    ? wrapOneHook__Ivy(target, hookName, wrappingFn)
    : wrapOneHook__ViewEngine(target, hookName, wrappingFn);
}

function wrapOneHook__Ivy(target: any, hookName: string, wrappingFn: (target: ClassWithSubscription) => void): void {
  const ivyHookName = hookName.slice(0, 1).toLowerCase() + hookName.slice(1);
  const ivyDef: any = getIvyDef(target);

  const originalHook: () => void = ivyDef[ivyHookName];
  ivyDef[ivyHookName] = function (): void {
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
