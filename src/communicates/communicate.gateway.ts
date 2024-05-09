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
  INVALID_JSON_REQUEST,
  METHOD_IS_NOT_ALLOWED,
} from 'src/constant/exception.constant';
import { TypeCheckService } from 'src/services';

@WebSocketGateway()
export class CommunicateGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('AppGateway');
  private allowedMethods: RegExp[];

  constructor(
    private readonly configService: ConfigService,
    private readonly typeCheckService: TypeCheckService,
    private readonly webSocketService: WebSocketService,
  ) {
    this.allowedMethods = this.configService.get<RegExp[]>(
      'allowedMethods',
    ) ?? [/^.*$/];
  }

  async handleDisconnect(): Promise<void> {
    this.logger.log(`Client disconneted`);
    this.webSocketService.close();
  }

  async handleConnection(client: WebSocket): Promise<void> {
    this.logger.log(`Client connected`);
    // connect to node's websocket
    const url = this.configService.get<string>('nodeSocket')!;
    this.webSocketService.connect(url);

    // listen to message from verse proxy websocket
    client.on('message', (data) => {
      const dataString = data.toString();
      // for test connection
      if (dataString == 'ping') {
        return client.send('pong');
      }

      // check if server is connect to node or not
      if (!this.webSocketService.isConnected()) {
        client.send(CONNECTION_IS_CLOSED);
        client.close();
      }
      try {
        const jsonData = this.checkValidJson(dataString);
        this.checkMethod(jsonData.method);
        this.webSocketService.send(data.toString());
      } catch (e) {
        // if input not a valid json object or method is not  then send message to client and close connect
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
        }
        client.close();
      }
    });

    // listen to message return from node's websocket
    this.webSocketService.on((data: any) => {
      const dataString = data.toString();
      client.send(data);

      // close connection if node's websocket return error
      if (
        this.typeCheckService.isJsonrpcErrorResponse(
          JSON.parse(dataString.toString()),
        )
      ) {
        client.close();
      }
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

  checkMethod(method: string) {
    const checkMethod = this.allowedMethods.some((allowedMethod) => {
      return allowedMethod.test(method);
    });
    if (!checkMethod) {
      throw new Error(ESocketError.METHOD_IS_NOT_ALLOWED);
    }
  }
}
