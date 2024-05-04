import { Injectable, Logger } from '@nestjs/common';
import * as WebSocket from 'ws';
import { CommunicateService } from './communicate.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CommunicateGateway {
  private wss: WebSocket.Server;
  private readonly logger = new Logger(CommunicateGateway.name);

  constructor(
    private readonly communicateService: CommunicateService,
    private readonly configService: ConfigService,
  ) {
    this.wss = new WebSocket.Server({ port: this.configService.get('wsPort') });

    this.wss.on('connection', (ws: WebSocket, req: any) => {
      ws.on('message', async (message: string) => {
        if (message === 'ping') {
          return ws.send('pong');
        }

        try {
          const data = JSON.parse(message);
          const requestContext = {
            ip: req.connection.remoteAddress || '',
            headers: req.headers,
          };
          const response = await this.communicateService.sendRequest(
            requestContext,
            data,
          );
          return ws.send(
            JSON.stringify({
              method: data.method,
              response: response.data,
            }),
          );
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      });

      ws.on('close', () => {
        this.logger.log('disconnected');
      });
    });
  }
}
