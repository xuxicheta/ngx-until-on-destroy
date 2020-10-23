import { Component, Input, OnInit, } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { UntilOnDestroy } from 'ngx-until-on-destroy';
import { messageProbe } from '../message-probe';

@Component({
  selector: 'app-test1',
  templateUrl: './test1.component.html',
  styleUrls: ['./test1.component.css']
})
export class Test1Component implements OnInit {
  @Input() name: string;
  public sub1 = new Subject<string>();

  value: string;

  constructor() {
  }

  ngOnInit(): void {
    this.valueSub();
    this.sub1.next(this.name + ' value');
  }

  @UntilOnDestroy()
  private valueSub(): Subscription {
    return this.sub1.pipe(
      messageProbe(this.name)
    )
      .subscribe(v => this.value = v);
  }
}
