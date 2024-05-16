import * as WebSocket from 'ws';
import { Injectable, Logger } from '@nestjs/common';
import { ESocketError } from 'src/constant/exception.constant';
import { defer } from 'src/shared/utils';
import { ConfigService } from '@nestjs/config';
type Listener = (data: any) => void;
@Injectable()
export class WebSocketService {
  private socket: WebSocket;
  private eventListeners: Listener[] = [];
  private logger: Logger = new Logger('WebSocketService');
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts: number;

  constructor(private readonly configService: ConfigService) {
    this.url = this.configService.get<string>('nodeSocket')!;
    this.maxReconnectAttempts =
      +this.configService.get<string>('reconnectAttempts')!;
  }

  connect() {
    this.socket = new WebSocket(this.url);

    this.socket.on('open', () => {
      this.logger.log('WebSocket connection established.');
      this.reconnectAttempts = 0;
    });

    this.socket.on('message', (data) => {
      this.handleMessage(data.toString());
    });

    this.socket.on('close', () => {
      this.logger.log('WebSocket connection closed.');
      this.reconnect();
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
    return this.socket.readyState == this.socket.OPEN;
  }

  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const timeout = Math.min(1000 * 2 ** this.reconnectAttempts, 30000); // Exponential backoff, max 30 seconds
      this.logger.log(
        `Attempting to reconnect in ${timeout / 1000} seconds...`,
      );
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, timeout);
    } else {
      this.logger.error('Max reconnect attempts reached. Giving up.');
    }
  }
}
