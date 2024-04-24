import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { CommunicateService } from './communicate.service';

@WebSocketGateway()
export class CommunicateGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(CommunicateGateway.name);
  @WebSocketServer() io: Server;

  constructor(private readonly communicateService: CommunicateService) {}
  afterInit(server: any): any {
    this.logger.log('Initialized');
  }

  handleConnection(client: any, ...args: any[]): any {
    const { sockets } = this.io.sockets;
    this.logger.log(`Client id: ${client.id} connected`);
    this.logger.debug(`Number of connected clients ${sockets.size}`);
  }

  handleDisconnect(client: any): any {
    this.logger.log(`Client id: ${client.id} disconnected`);
  }

  @SubscribeMessage('ping')
  pingMessage(client: any, data: any) {
    this.logger.log(`Message received from client id: ${client.id}`);
    this.logger.debug(`Payload: ${data}`);
    return {
      event: 'pong',
      data,
    };
  }

  @SubscribeMessage('execute')
  async executeCommand(client: Socket, data: { method: string; data: string }) {
    this.logger.log(`Message execute received from client id: ${client.id}`);
    this.logger.debug(`Payload: ${data}`);
    const response = await this.communicateService.sendRequest(
      data.method,
      data.data,
    );
    return {
      event: 'executed',
      data: { method: data.method, response: response },
    };
  }
}
