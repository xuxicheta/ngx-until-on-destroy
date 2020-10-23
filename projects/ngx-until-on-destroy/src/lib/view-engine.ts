import { decorateMethod } from './decorate-method';
import { WrapParams } from './wrap-param.interface';
import { VERSION } from '@angular/core';

function getViewEngineError(hookName: string, constructorName: string): Error {
  return new Error(`You have to implements ${hookName} in component (or directive) ${constructorName}`);
}

export function wrapViewEngineHook<T>(
  {
    target,
    hookName,
    oldName,
    wrappingFn
  }: WrapParams<T>
): void {
  const veHookName = 'ng' + hookName;

  if (!target[veHookName] && +VERSION.major < 9) {
    throw getViewEngineError(veHookName, target.constructor.name);
  }

  target[veHookName] = decorateMethod({
    target,
    hookName: veHookName,
    oldName,
    wrappingFn
  });
}
