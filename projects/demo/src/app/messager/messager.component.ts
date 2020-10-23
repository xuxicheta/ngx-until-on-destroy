import { Component, OnDestroy, OnInit } from '@angular/core';
import { MessageData } from '../message-probe';

@Component({
  selector: 'app-messager',
  templateUrl: './messager.component.html',
  styleUrls: ['./messager.component.css']
})
export class MessagerComponent implements OnInit, OnDestroy {
  private messageHandler = this.createMessageHandler();
  messagesBuffer: MessageData[] = [];

  constructor() {
  }

  ngOnInit(): void {
    this.listenMessages();
  }

  ngOnDestroy(): void {
    window.removeEventListener('message', this.messageHandler);
  }

  private listenMessages(): void {
    window.addEventListener('message', this.messageHandler);
  }

  private createMessageHandler(): (evt: MessageEvent) => void {
    return (evt) => {
      const message: MessageData = evt.data;
      if (message?.id === 'messageData') {
        this.messagesBuffer.push(message);
      }
    };
  }

}
