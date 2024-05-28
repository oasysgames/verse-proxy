import { INestApplication } from '@nestjs/common';
import { WSGateway } from '../websocket.gateway';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import configuration from '../../config/configuration';
import { HttpModule } from '@nestjs/axios';
import * as WebSocket from 'ws';
import { WsAdapter } from '@nestjs/platform-ws';
import { DatastoreService } from 'src/repositories';
import {
  AllowCheckService,
  ProxyService,
  RateLimitService,
  TransactionService,
  TypeCheckService,
  VerseService,
} from 'src/services';
import { WSClientManagerService } from 'src/services';

describe('WSGateway', () => {
  let moduleRef: TestingModule;
  let app: INestApplication;
  let datastore: DatastoreService;
  let manager: WSClientManagerService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [configuration],
        }),
        HttpModule,
      ],
      providers: [
        VerseService,
        TransactionService,
        ProxyService,
        AllowCheckService,
        TypeCheckService,
        DatastoreService,
        RateLimitService,
        WSGateway,
        WSClientManagerService,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useWebSocketAdapter(new WsAdapter(app));

    await app.init();
    await app.listen(3000);

    datastore = moduleRef.get<DatastoreService>(DatastoreService);
    manager = moduleRef.get<WSClientManagerService>(WSClientManagerService);
  });

  afterAll(async () => {
    // test will not finish unless all connections are closed
    datastore.close();
    manager.close();
    await app.close();
  });

  it('handle new client', async () => {
    const managerSpy = jest.spyOn(manager, 'add').mockImplementation();

    const ws = new WebSocket('ws://127.0.0.1:3000');
    await new Promise((resolve) => ws.on('open', resolve));

    expect(managerSpy).toBeCalledTimes(1);
    const callArgs = managerSpy.mock.calls[0];
    expect(callArgs[0].readyState).toEqual(1);
    expect(callArgs[1].headers.host).toEqual('127.0.0.1:3000');

    ws.close();
    await new Promise((resolve) => ws.on('close', resolve));
  });
});
