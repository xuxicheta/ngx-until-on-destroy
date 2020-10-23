import { Subscription } from 'rxjs';
import { subSymbol } from './ngx-symbols';
import { Type } from '@angular/core';

export interface TypeWithSubscription<T> extends Type<T> {
  [subSymbol]?: Subscription;
}
