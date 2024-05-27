import { IncomingMessage } from 'http';
import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
} from '@nestjs/websockets';
import { WebSocket } from 'ws';
import { WSClientManagerService } from 'src/services';

/**
 * The WebSocketGateway only passes the connected WebSocket clients
 * to the WSClientManagerService. The management of the connection
 * state is delegated to the WSClientManagerService.
 */
@WebSocketGateway()
export class WSGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger: Logger = new Logger('WSGateway');

  constructor(private readonly manager: WSClientManagerService) {}

  async handleConnection(client: WebSocket, request: IncomingMessage) {
    this.logger.debug('Client connected');
    this.manager.add(client, request);
  }

  async handleDisconnect() {
    this.logger.debug('Client disconneted');
  }
}
