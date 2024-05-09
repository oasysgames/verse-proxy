import * as WebSocket from 'ws';
import { Injectable, Logger } from '@nestjs/common';
import { ESocketError } from 'src/constant/exception.constant';
type Listener = (data: any) => void;
@Injectable()
export class WebSocketService {
  private socket: WebSocket;
  private eventListeners: Listener[] = [];
  private logger: Logger = new Logger('WebSocketService');

  connect(url: string) {
    this.socket = new WebSocket(url);

    this.socket.on('open', () => {
      this.logger.log('WebSocket connection established.');
    });

    this.socket.on('message', (data) => {
      this.handleMessage(data.toString());
    });

    this.socket.on('close', () => {
      this.logger.log('WebSocket connection closed.');
      // throw new Error(ESocketError.CONNECTION_IS_CLOSED);
    });
  }

  private handleMessage(message: string) {
    try {
      this.eventListeners.forEach((listener) => listener(message));
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  send(message: string) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("The Node's WebSocket connection is not open.");
    }
    this.socket.send(message);
  }

  on(listener: Listener) {
    this.eventListeners.push(listener);
  }

  close() {
    this.socket.close();
  }

  isConnected() {
    if (this.socket.readyState != this.socket.OPEN) {
      return false;
    }
    return true;
  }
}
