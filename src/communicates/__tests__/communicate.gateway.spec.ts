import { CacheModule, INestApplication, Logger } from '@nestjs/common';
import { Socket, io } from 'socket.io-client';
import { CommunicateGateway } from '../communicate.gateway';
import { CommunicateService } from '../communicate.service';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import configuration from '../../config/configuration';
import { DatastoreService } from 'src/repositories';
import { VerseService, AllowCheckService, TransactionService, ProxyService, TypeCheckService, RateLimitService } from 'src/services';
import { HttpModule } from '@nestjs/axios';

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
  let gateway: CommunicateGateway;
  let app: INestApplication;
  let ioClient: Socket;

  beforeAll(async () => {
    app = await createNestApp(
      CommunicateGateway,
      CommunicateService,
      VerseService,
      AllowCheckService,
      TransactionService,
      ProxyService,
      TypeCheckService,
      DatastoreService,
      RateLimitService,
    );
    gateway = app.get<CommunicateGateway>(CommunicateGateway);
    app.listen(3001);
  });

  beforeEach(async () => {
    ioClient = io('http://localhost:3001', {
      autoConnect: false,
      transports: ['websocket', 'pooling'],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it(`Should emit "pong" on "ping"`, async () => {
    ioClient.connect();
    ioClient.emit('ping', 'Hello World!');
    await new Promise<void>((resolve) => {
      ioClient.on('connect', () => {
        console.log('Connected');
      });
      ioClient.on('pong', (data) => {
        expect(data).toBe('Hello World!');
        resolve();
      });
    });

    ioClient.disconnect();
  });

  it('execute method is not allowed', async () => {
    const body = {
      jsonrpc: '2.0',
      method: 'bnb_chainId',
      params: [
        '0xf8620180825208948626f6940e2eb28930efb4cef49b2d1f2c9c11998080831e84a2a06c33b39c89e987ad08bc2cab79243dbb2a44955d2539d4f5d58001ae9ab0a2caa06943316733bd0fd81a0630a9876f6f07db970b93f367427404aabd0621ea5ec1',
      ],
      id: 1,
    };
    ioClient.connect();
    ioClient.emit('execute', body);
    await new Promise<void>((resolve) => {
      ioClient.on('connect', () => {
        console.log('Connected');
      });
      ioClient.on('executed', (data) => {
        expect(data.method).toBe('bnb_chainId');
        expect(data.response.error.message).toBe(
          'Method bnb_chainId is not allowed',
        );
        resolve();
      });
    });

    ioClient.disconnect();
  });

  it('executed method net_version', async () => {
    const body = {
      jsonrpc: '2.0',
      method: 'net_version',
      params: [],
      id: 1,
    };

    ioClient.connect();
    ioClient.emit('execute', body);
    await new Promise<void>((resolve) => {
      ioClient.on('connect', () => {
        console.log('Connected');
      });
      ioClient.on('executed', (data) => {
        expect(data.method).toBe('net_version');
        expect(data.response.result).toBe(
          '12345',
        );
        resolve();
      });
    });

    ioClient.disconnect();
  });
});
