import { UntilOnDestroy } from './until-on-destroy';
import { timer, Observable, of } from 'rxjs';
import { mapTo, finalize } from 'rxjs/operators';

interface OnInit {
  ngOnInit(): void;
}

interface OnDestroy {
  ngOnDestroy(): void;
}

const delay = (time: number) => new Promise(resolve => setTimeout(resolve, time));

class FakeComponent implements OnDestroy, OnInit {
  request = (value: any) => timer(300).pipe(mapTo(value));

  @UntilOnDestroy()
  subscribeRequest(value: any, cb: any = () => { }) {
    return this.request(value).subscribe(cb);
  }

  subscribeRequestWithOutDecorator(value: any, cb: any = () => { }) {
    return this.request(value).subscribe(cb);
  }

  @UntilOnDestroy()
  subscribeCustomObservable(obs$: Observable<any>, cb: any = () => { }) {
    return obs$.subscribe(cb);
  }

  ngOnDestroy() { }
  ngOnInit() { }
}

function ivify<T extends (OnDestroy & OnInit) >(component: T) {
  component.constructor['ɵcmp'] = {
    onInit: component.ngOnInit,
    onDestroy: component.ngOnDestroy,
  }
  return component;
}

function setup() {
  const component = new FakeComponent();
  const value = Math.random();
  component.ngOnInit();
  return { component, value };
}


describe('UntilOnDestroy.decorator', () => {
  describe.skip('ViewEngine', () => {
    it('should not break ordinary work', async () => {
      // arrange
      const { component, value } = setup();
      const cb = jest.fn();
      // act
      component.subscribeRequest(value, cb);
      await delay(400);
      // assert
      expect(cb.mock.calls.length).toEqual(1);
      expect(cb.mock.calls[0][0]).toEqual(value);
    });

    it('should complete decorated subscriptions at ngOnDestroy', async () => {
      // arrange
      const { component, value } = setup();
      const cb = jest.fn();
      // act
      const sub = component.subscribeRequestWithOutDecorator(value, cb);
      await delay(100);
      component.ngOnDestroy();
      // assert
      expect(sub.closed).toBeFalsy();
    });

    it('should not complete not decorated subscriptions at ngOnDestroy', async () => {
      // arrange
      const { component, value } = setup();
      const cb = jest.fn();
      const spycomplete = jest.fn();
      const obs$ = timer(300).pipe(mapTo(value), finalize(spycomplete));
      // act
      const sub = component.subscribeCustomObservable(obs$, cb);
      await delay(100);
      component.ngOnDestroy();
      // assert
      expect(cb.mock.calls.length).toEqual(0);
      expect(spycomplete.mock.calls.length).toEqual(1);
      expect(sub.closed).toBeTruthy();
    });

    it('should throw error if there are not ngOnInit', () => {
      // arrange
      const resultFn = () => {
        class NoInitComponent implements OnDestroy {
          ngOnDestroy() { }

          @UntilOnDestroy()
          obs() {
            return of(null).subscribe();
          }
        }
      };
      // assert
      expect(resultFn).toThrowError(`You have to implements ngOnInit in component NoInitComponent`);
    });

    it('should throw error if there are not ngOnDestroy', () => {
      // arrange
      const resultFn = () => {
        class NoDestroyComponent implements OnInit {
          ngOnInit() { }

          @UntilOnDestroy()
          obs() {
            return of(null).subscribe();
          }
        }
      };
      // assert
      expect(resultFn).toThrowError(`You have to implements ngOnDestroy in component NoDestroyComponent`);
    });

  });

  describe('Ivy', () => {
    it('should not break ordinary work', async () => {
      // arrange
      const { component, value } = setup();
      const ivyComponent = ivify(component);
      const cb = jest.fn();
      // act
      ivyComponent.subscribeRequest(value, cb);
      await delay(400);
      // assert
      expect(cb.mock.calls.length).toEqual(1);
      expect(cb.mock.calls[0][0]).toEqual(value);
    });

    it('should complete decorated subscriptions at ngOnDestroy', async () => {
      // arrange
      const { component, value } = setup();
      const ivyComponent = ivify(component);
      const cb = jest.fn();
      // act
      const sub = ivyComponent.subscribeRequestWithOutDecorator(value, cb);
      await delay(100);
      ivyComponent.ngOnDestroy();
      // assert
      expect(sub.closed).toBeFalsy();
    });

    it('should not complete not decorated subscriptions at ngOnDestroy', async () => {
      // arrange
      const { component, value } = setup();
      const ivyComponent = ivify(component);
      const cb = jest.fn();
      const spycomplete = jest.fn();
      const obs$ = timer(300).pipe(mapTo(value), finalize(spycomplete));
      // act
      const sub = ivyComponent.subscribeCustomObservable(obs$, cb);
      await delay(100);
      ivyComponent.ngOnDestroy();
      // assert
      expect(cb.mock.calls.length).toEqual(0);
      expect(spycomplete.mock.calls.length).toEqual(1);
      expect(sub.closed).toBeTruthy();
    });

    it('should throw error if there are not ngOnInit', () => {
      // arrange
      const resultFn = () => {
        class NoInitComponent implements OnDestroy {
          ngOnDestroy() { }

          @UntilOnDestroy()
          obs() {
            return of(null).subscribe();
          }
        }
      };
      // assert
      expect(resultFn).toThrowError(`You have to implements ngOnInit in component NoInitComponent`);
    });

    it('should throw error if there are not ngOnDestroy', () => {
      // arrange
      const resultFn = () => {
        class NoDestroyComponent implements OnInit {
          ngOnInit() { }

          @UntilOnDestroy()
          obs() {
            return of(null).subscribe();
          }
        }
      };
      // assert
      expect(resultFn).toThrowError(`You have to implements ngOnDestroy in component NoDestroyComponent`);
    });

  });






});
