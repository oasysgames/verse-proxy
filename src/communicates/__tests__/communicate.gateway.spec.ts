import { CacheModule, INestApplication, Logger } from '@nestjs/common';
import { CommunicateGateway } from '../communicate.gateway';
import { CommunicateService } from '../communicate.service';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import configuration from '../../config/configuration';
import { DatastoreService } from 'src/repositories';
import {
  VerseService,
  AllowCheckService,
  TransactionService,
  ProxyService,
  TypeCheckService,
  RateLimitService,
} from 'src/services';
import { HttpModule } from '@nestjs/axios';
import * as WebSocket from 'ws';

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
      CommunicateGateway,
    );
    app.listen(3000);
    client = new WebSocket('ws://localhost:3001');
  });

  afterAll(async () => {
    if (client.readyState === client.OPEN) {
      client.close();
    }
    await app.close();
  });

  it(`Should emit "pong" on "ping"`, (done) => {
    client.on('open', () => {
      client.ping();
    });
    client.on('pong', () => {
      done();
    });
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

    client.on('open', async () => {
      client.send(JSON.stringify(body));
    });
    client.addListener('message', (message) => {
      const data = JSON.parse(message.toString());
      expect(data.method).toBe('bnb_chainId');
      expect(data.response.error.message).toBe(
        'Method bnb_chainId is not allowed',
      );
    });
  });

  it('executed method net_version', async () => {
    const body = {
      jsonrpc: '2.0',
      method: 'net_version',
      params: [],
      id: 1,
    };

    client.on('open', async () => {
      client.send(JSON.stringify(body));
    });
    client.addListener('message', (message) => {
      const data = JSON.parse(message.toString());
      expect(data.method).toBe('net_version');
      expect(data.response.result).toBe('12345');
    });
  });
});
