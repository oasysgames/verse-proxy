import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsResponse,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { CommunicateService } from './communicate.service';
import { JsonrpcRequestBody } from 'src/entities';

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
  pingMessage(client: any, data: any): WsResponse {
    this.logger.log(`Message received from client id: ${client.id}`);
    this.logger.debug(`Payload: ${data}`);
    return {
      event: 'pong',
      data,
    };
  }

  @SubscribeMessage('execute')
  async executeCommand(
    client: Socket,
    data: JsonrpcRequestBody,
  ): Promise<WsResponse> {
    this.logger.log(`Message execute received from client id: ${client.id}`);
    this.logger.debug(`Payload: ${JSON.stringify(data)}`);

    const requestContext = {
      ip: client.conn.remoteAddress,
      headers: client.handshake.headers,
    };
    const response = await this.communicateService.sendRequest(
      requestContext,
      data,
    );
    return {
      event: 'executed',
      data: { method: data.method, response: response.data },
    };
  }
}
