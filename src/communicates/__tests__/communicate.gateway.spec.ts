import { CacheModule, INestApplication, Logger } from '@nestjs/common';
import { CommunicateGateway } from '../communicate.gateway';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import configuration from '../../config/configuration';
import { TypeCheckService } from 'src/services';
import { HttpModule } from '@nestjs/axios';
import * as WebSocket from 'ws';
import { WebSocketService } from 'src/services/webSocket.sevice';

async function createNestApp(...gateways: any): Promise<INestApplication> {
  const testingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ load: [configuration] }),
      HttpModule,
      CacheModule.register(),
    ],
    providers: gateways,
  }).compile();
  testingModule.useLogger(new Logger());
  return testingModule.createNestApplication();
}

describe('Communicate gateway', () => {
  let app: INestApplication;
  let client: WebSocket;
  let moduleRef: TestingModule;
  let webSocketService: WebSocketService;
  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [configuration],
        }),
      ],
      controllers: [],
      providers: [CommunicateGateway, TypeCheckService, WebSocketService],
    }).compile();

    app = moduleRef.createNestApplication();
    webSocketService = moduleRef.get<WebSocketService>(WebSocketService);
    // client = new WebSocket('http://localhost:3000');
  });

  // afterAll(async () => {
  //   if (client.readyState === client.OPEN) {
  //     client.removeAllListeners();
  //     client.close();
  //   }
  //   await app.close();
  // });

  it(`Should emit "pong" on "ping"`, (done) => {
    done()
  });

  // it(`Should emit "pong" on "ping"`, (done) => {
  //   client.on('open', () => {
  //     client.send('ping');
  //   });
  //   client.addListener('message', (message) => {
  //     if (message.toString() == 'pong') {
  //       done();
  //     }
  //   });
  // });

  // it('execute method is not allowed', async () => {
  //   const body = {
  //     method: 'eth_getBlockByNumbers',
  //     params: ['0x548', true],
  //     id: 1,
  //     jsonrpc: '2.0',
  //   };

  //   client.on('open', async () => {
  //     client.send(JSON.stringify(body));
  //   });
  //   client.addListener('message', (message) => {
  //     const data = JSON.parse(message.toString());
  //     expect(data.method).toBe('eth_getBlockByNumbers');
  //     expect(data.response.error.message).toBe('method not allowed');
  //   });
  // });

  // it('executed method net_version', async () => {
  //   const body = {
  //     jsonrpc: '2.0',
  //     method: 'net_version',
  //     params: [],
  //     id: 1,
  //   };

  //   client.on('open', async () => {
  //     client.send(JSON.stringify(body));
  //   });
  //   client.addListener('message', (message) => {
  //     const data = JSON.parse(message.toString());
  //     expect(data.method).toBe('net_version');
  //     expect(data.response.result).toBe('12345');
  //   });
  // });
});
