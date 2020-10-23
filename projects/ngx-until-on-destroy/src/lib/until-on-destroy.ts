import { Subscription } from 'rxjs';
import { TypeWithSubscription } from './class-with-subscription.interface';
import { isIvy, wrapIvyHook } from './ivy';
import { wrapViewEngineHook } from './view-engine';
import { WrapParams } from './wrap-param.interface';
import { Type } from '@angular/core';
import { decoratedSymbol, onDestroySymbol, onInitSymbol, subSymbol } from './ngx-symbols';


type SubscriptionMethod = (...args: any[]) => Subscription | Subscription[];


function markAsDecorated(target: any): void {
  target[decoratedSymbol] = true;
}

function isDecorated<T>(target: Type<T>): target is TypeWithSubscription<T> {
  return target.hasOwnProperty(decoratedSymbol);
}


function createMethodWrapper<T>(originalMethod: SubscriptionMethod): SubscriptionMethod {
  return function(this: TypeWithSubscription<T>, ...args: any[]): (Subscription | Subscription[]) {
    const originalResult: Subscription | Subscription[] = originalMethod.apply(this, args);

    if (originalResult instanceof Subscription) {
      this[subSymbol].add(originalResult);
    } else if (Array.isArray(originalResult)) {
      (originalResult as Subscription[]).forEach(s => this[subSymbol].add(s));
    } else {
      throw new Error('Decorated method must return Subscription or Subscription[]');
    }
    return originalResult;
  };
}

function wrapOneHook<T>(wrapParams: WrapParams<T>): void {
  if (isIvy(wrapParams.target)) {
    wrapIvyHook(wrapParams);
  }
  wrapViewEngineHook(wrapParams);
}


function wrapHooks<T>(target: Type<T>): void {
  if (!isDecorated(target)) {
    markAsDecorated(target);

    wrapOneHook({
      target,
      hookName: 'OnInit',
      oldName: onInitSymbol,
      wrappingFn(): void {
        this[subSymbol] = new Subscription();
      }
    });

    wrapOneHook({
      target,
      hookName: 'OnDestroy',
      oldName: onDestroySymbol,
      wrappingFn(): void {
        this[subSymbol].unsubscribe();
      }
    });
  }
}


export function UntilOnDestroy<T>(): MethodDecorator {
  return function UntilOnDestroyDecorator(target: Type<T>, propertyKey: string): TypedPropertyDescriptor<SubscriptionMethod> {
    wrapHooks(target);
    return {
      value: createMethodWrapper(target[propertyKey]),
    };
  } as MethodDecorator;
}
