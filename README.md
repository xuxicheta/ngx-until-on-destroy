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

  ngOnInit() {
    this.mySubscription();
  }

  ngOnDestroy() { } // not nessecary after Angular 9

  @UntilOnDestroy()
  mySubscription(): Subscription {
    return interval(1000)
      .subscribe((v) => console.log(v))
  }
}
```

When component will be destroyed, all subscriptions from decorated methods will be unsubscribed.

In ViewEngine you have to implement OnInit and OnDestroy.
In Ivy it works without them.
