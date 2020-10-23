import { WrapParams } from './wrap-param.interface';

export function decorateMethod<T>(
  {
    target,
    hookName,
    oldName,
    wrappingFn
  }: WrapParams<T>
): () => void {
  const oldMethod = target[hookName];
  target[oldName] = oldMethod;

  return function(): ReturnType<typeof oldMethod> {
    wrappingFn.call(this);

    if (oldMethod) {
      return oldMethod.call(this);
    }
  };
}
