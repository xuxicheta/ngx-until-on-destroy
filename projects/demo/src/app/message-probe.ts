import { defer, MonoTypeOperatorFunction } from 'rxjs';
import { finalize } from 'rxjs/operators';

export interface MessageData {
  id: 'messageData';
  type: 'subscribe' | 'unsubscribe';
  name: string;
}


export function messageProbe<T>(name: string): MonoTypeOperatorFunction<T> {
  return source => defer(() => {
    window.postMessage({
      id: 'messageData',
      type: 'subscribe',
      name,
    }, '*');
    return source.pipe(
      finalize(() => {
        window.postMessage({
          id: 'messageData',
          type: 'unsubscribe',
          name,
        }, '*');
      }),
    );
  });
}
