/* tslint:disable:typedef no-string-literal */
import { UntilOnDestroy } from './until-on-destroy';
import { timer, Observable, of, Subscription } from 'rxjs';
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
  subscribeRequest(value: any, cb: any = () => { }): Subscription {
    return this.request(value).subscribe(cb);
  }

  subscribeRequestWithOutDecorator(value: any, cb: any = () => { }): Subscription {
    return this.request(value).subscribe(cb);
  }

  @UntilOnDestroy()
  subscribeCustomObservable(obs$: Observable<any>, cb: any = () => { }): Subscription {
    return obs$.subscribe(cb);
  }

  ngOnDestroy(): void { }
  ngOnInit(): void { }
}

function IviFy<T extends (OnDestroy & OnInit) >(component: T): T {
  component.constructor['ɵcmp'] = {
    onInit: component.ngOnInit,
    onDestroy: component.ngOnDestroy,
  };
  return component;
}

function setup() {
  const component = new FakeComponent();
  const value = Math.random();
  component.ngOnInit();
  return { component, value };
}


describe('UntilOnDestroy.decorator', () => {
  describe('ViewEngine', () => {
    it('should not break ordinary work', async () => {
      // arrange
      const { component, value } = setup();
      const cb = jasmine.createSpy();
      // act
      component.subscribeRequest(value, cb);
      await delay(400);
      // assert
      expect(cb.calls.all().length).toEqual(1);
      expect(cb.calls.all()[0].args[0]).toEqual(value);
    });

    it('should complete decorated subscriptions at ngOnDestroy', async () => {
      // arrange
      const { component, value } = setup();
      const cb = jasmine.createSpy();
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
      const cb = jasmine.createSpy();
      const spycomplete = jasmine.createSpy();
      const obs$ = timer(300).pipe(mapTo(value), finalize(spycomplete));
      // act
      const sub = component.subscribeCustomObservable(obs$, cb);
      await delay(100);
      component.ngOnDestroy();
      // assert
      expect(cb.calls.all().length).toEqual(0);
      expect(spycomplete.calls.all().length).toEqual(1);
      expect(sub.closed).toBeTruthy();
    });

    it('should throw error if there are not ngOnInit', () => {
      // arrange
      const resultFn = () => {
        class NoInitComponent implements OnDestroy {
          ngOnDestroy(): void { }

          @UntilOnDestroy()
          obs() {
            return of(null).subscribe();
          }
        }
      };
      // assert
      expect(resultFn).toThrowError(`You have to implements ngOnInit in component (or directive) NoInitComponent`);
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
      expect(resultFn).toThrowError(`You have to implements ngOnDestroy in component (or directive) NoDestroyComponent`);
    });

  });

  describe('Ivy', () => {
    it('should not break ordinary work', async () => {
      // arrange
      const { component, value } = setup();
      const ivyComponent = IviFy(component);
      const cb = jasmine.createSpy();
      // act
      ivyComponent.subscribeRequest(value, cb);
      await delay(400);
      // assert
      const callsResult = cb.calls.all();
      expect(callsResult.length).toEqual(1);
      expect(callsResult[0].args[0]).toEqual(value);
    });

    it('should complete decorated subscriptions at ngOnDestroy', async () => {
      // arrange
      const { component, value } = setup();
      const ivyComponent = IviFy(component);
      const cb = jasmine.createSpy();
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
      const ivyComponent = IviFy(component);
      const cb = jasmine.createSpy();
      const spycomplete = jasmine.createSpy();
      const obs$ = timer(300).pipe(mapTo(value), finalize(spycomplete));
      // act
      const sub = ivyComponent.subscribeCustomObservable(obs$, cb);
      await delay(100);
      ivyComponent.ngOnDestroy();
      // assert
      expect(cb.calls.all().length).toEqual(0);
      expect(spycomplete.calls.all().length).toEqual(1);
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
      expect(resultFn).toThrowError(`You have to implements ngOnInit in component (or directive) NoInitComponent`);
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
      expect(resultFn).toThrowError(`You have to implements ngOnDestroy in component (or directive) NoDestroyComponent`);
    });

  });
});
