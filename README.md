# UntilOnDestroy decorator

Allow you unsubscribe subscriptions when component was destroying.


## How to use it

```javascript
import { Component, OnInit } from '@angular/core';
import { UntilOnDestroy } from 'ngx-until-on-destroy';
import { interval } from 'rxjs';

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
    return interval(1000)
      .subscribe((v) => console.log(v))
  }
}
```
I can be applied to methods of component or directive only.

When component/directive will be destroyed, all subscriptions from decorated methods will be unsubscribed.

In ViewEngine you have to implement OnInit and OnDestroy.<br>
In Ivy it works without them.
