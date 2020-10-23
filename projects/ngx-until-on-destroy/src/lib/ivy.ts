import { decorateMethod } from './decorate-method';
import { componentDefKey, directiveDefKey, factoryDefKey } from './angular-keys';
import { Type, ɵComponentDef as ComponentDef, ɵDirectiveDef as DirectiveDef } from '@angular/core';
import { WrapParams } from './wrap-param.interface';

export const isIvy = (target: any) => target.constructor[factoryDefKey];

function getIvyDef<T>(target: Type<T>): ComponentDef<T> | DirectiveDef<T> {
  return target.constructor[componentDefKey] || target.constructor[directiveDefKey];
}


export function wrapIvyHook<T>(
  {
    target,
    hookName,
    oldName,
    wrappingFn
  }: WrapParams<T>
): void {
  const ivyHookName = hookName.slice(0, 1).toLowerCase() + hookName.slice(1);
  const ivyDef: any = getIvyDef(target);

  ivyDef[ivyHookName] = decorateMethod({
    target: ivyDef,
    hookName: ivyHookName,
    oldName,
    wrappingFn,
  });
}
