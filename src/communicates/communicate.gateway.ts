import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'ws';
import * as WebSocket from 'ws';
import { WebSocketService } from 'src/services/webSocket.sevice';
import {
  CONNECTION_IS_CLOSED,
  ESocketError,
  ID,
  INVALID_JSON_REQUEST,
  JSONRPC,
  METHOD_IS_NOT_ALLOWED,
  TRANSACTION_IS_INVALID,
  TRANSACTION_NOT_FOUND,
} from 'src/constant/exception.constant';
import {
  TransactionService,
  TypeCheckService,
  VerseService,
} from 'src/services';
import { JsonrpcError, JsonrpcRequestBody } from 'src/entities';
import { DatastoreService } from 'src/repositories';
import { CommunicateService } from 'src/services/communicate.service';

@WebSocketGateway()
export class CommunicateGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('AppGateway');
  private isUseReadNode: boolean;
  constructor(
    private readonly configService: ConfigService,
    private readonly webSocketService: WebSocketService,
    private readonly communicateService: CommunicateService,
  ) {}

  afterInit() {
    this.isUseReadNode = !!this.configService.get<string>('verseReadNodeUrl');
    const url = this.configService.get<string>('nodeSocket')!;
    if (url) this.webSocketService.connect(url);
  }

  async handleDisconnect(): Promise<void> {
    this.logger.log(`Client disconneted`);
  }

  async handleConnection(client: WebSocket): Promise<void> {
    this.logger.log(`Client connected`);
    // connect to node's websocket

    // listen to message from verse proxy websocket
    client.on('message', async (data) => {
      const dataString = data.toString();
      // for test connection
      if (dataString == 'ping') {
        client.send('pong');
        return;
      }
      // check if server is connected to node or not
      if (!this.webSocketService || !this.webSocketService.isConnected()) {
        client.send(CONNECTION_IS_CLOSED);
        return;
      }

      try {
        const jsonData = this.checkValidJson(dataString);
        const result = await this.communicateService.send(
          this.isUseReadNode,
          jsonData as JsonrpcRequestBody,
        );
        if (!result) {
          this.webSocketService.send(data.toString());
        } else {
          client.send(JSON.stringify(result.data));
        }
      } catch (e) {
        // if input not a valid json object or method is not allowed then send message to client and close connect
        switch (e.message) {
          case ESocketError.INVALID_JSON_REQUEST:
            client.send(INVALID_JSON_REQUEST);
            break;
          case ESocketError.METHOD_IS_NOT_ALLOWED:
            client.send(METHOD_IS_NOT_ALLOWED);
            break;
          case ESocketError.CONNECTION_IS_CLOSED:
            client.send(CONNECTION_IS_CLOSED);
            break;
          case ESocketError.TRANSACTION_NOT_FOUND:
            client.send(TRANSACTION_NOT_FOUND);
            break;
          case ESocketError.TRANSACTION_IS_INVALID:
            client.send(TRANSACTION_IS_INVALID);
            break;
          default:
            if (e instanceof JsonrpcError) {
              const data = {
                jsonrpc: JSONRPC,
                id: ID,
                error: {
                  code: e.code,
                  message: e.message,
                },
              };
              client.send(JSON.stringify(data));
            }
            break;
        }
      }
    });

    // listen to message return from node's websocket
    this.webSocketService.on(async (data: any) => {
      client.send(data);
    });
  }

  checkValidJson(input: string) {
    try {
      const json = JSON.parse(input);
      return json;
    } catch {
      throw new Error(ESocketError.INVALID_JSON_REQUEST);
    }
  }
}
