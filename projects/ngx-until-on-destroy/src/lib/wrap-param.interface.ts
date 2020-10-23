import { Type } from '@angular/core';
import { TypeWithSubscription } from './class-with-subscription.interface';

export interface WrapParams<T> {
  target: Type<T>;
  hookName: string;
  oldName: symbol;
  wrappingFn: (this: TypeWithSubscription<T>) => void;
}
