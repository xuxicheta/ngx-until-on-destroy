# UntilOnDestroy decorator

Allow you unsubscribe subscriptions when component was destroying.
Can be used with Angular 5-10


## How to use it

```javascript
import { Component, OnInit } from '@angular/core';
import { UntilOnDestroy } from 'ngx-until-on-destroy';
import { interval } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Component({
})
export class ChildComponent implements OnInit, OnDestroy {
  id: string;

  ngOnInit() { // not necessary after Angular 9
    this.mySubscription();
  }

  ngOnDestroy() { } // not necessary after Angular 9

  @UntilOnDestroy()
  mySubscription(): Subscription {
    return interval(1000).pipe(
      finalize(() => console.log('I am off!')),
    )
      .subscribe((v) => console.log(v))
  }
}
```
You can aply it to methods of components or directives only. Not in services.
Method should return Subscription or Subscriptions array.

When component/directive will be destroyed, all subscriptions from decorated methods will be unsubscribed.

From Angular 9 ang higher you have not to implement OnInit and OnDestroy.<br>
