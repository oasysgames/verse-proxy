import { CacheModule, INestApplication, Logger } from '@nestjs/common';
import { CommunicateGateway } from '../communicate.gateway';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import configuration from '../../config/configuration';
import { HttpModule } from '@nestjs/axios';
import * as WebSocket from 'ws';
import { WsAdapter } from '@nestjs/platform-ws';
import { DatastoreService } from 'src/repositories';
import {
  AllowCheckService,
  RateLimitService,
  TransactionService,
  TypeCheckService,
  VerseService,
} from 'src/services';
import { WebSocketService } from 'src/services/webSocket.sevice';
async function createNestApp(): Promise<INestApplication> {
  const testingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ load: [configuration] }),
      HttpModule,
      CacheModule.register(),
    ],
    providers: [
      CommunicateGateway,
      ConfigService,
      WebSocketService,
      TransactionService,
      VerseService,
      DatastoreService,
      TypeCheckService,
      AllowCheckService,
      RateLimitService,
    ],
  }).compile();
  testingModule.useLogger(new Logger());
  const app = testingModule.createNestApplication();
  app.useWebSocketAdapter(new WsAdapter(app) as any);
  return app;
}

function timeout(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('Communicate gateway', () => {
  let app: INestApplication;
  let ws: WebSocket;

  beforeAll(async () => {
    app = await createNestApp();
    await app.listen(3000);
    // await new Promise((resolve,reject) => {
    //   ws = new WebSocket('ws://localhost:3000');
    //   ws.on('open', resolve)
    //   ws.on('error', reject)
    // })
  });

  afterAll(async () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
      await new Promise<void>((resolve) => ws.on('close', resolve));
    }
    await app.close();
  });

  it('should emit "pong" on "ping"', async () => {
    await new Promise<void>((resolve, reject) => {
      ws.once('message', async (data) => {
        try {
          expect(data.toString()).toBe('pong');
          resolve();
        } catch (error) {
          reject(error);
        }
      });
      ws.send('ping');
    });
  });

  it('execute method is not allowed', async () => {
    const body = {
      method: 'eth_getBlockByNumbers',
      params: ['0x548', true],
      id: 1,
      jsonrpc: '2.0',
    };
    ws.send(JSON.stringify(body));
    await new Promise<void>((resolve, reject) => {
      ws.once('message', async (message) => {
        try {
          const data = JSON.parse(message.toString());
          expect(data.error.message).toBe(
            'the method eth_getBlockByNumbers does not exist/is not available',
          );
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  });
});
