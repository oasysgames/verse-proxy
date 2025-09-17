import { IncomingMessage } from 'http';
import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import configuration from '../../config/configuration';
import { HttpModule } from '@nestjs/axios';
import * as WebSocket from 'ws';
import { WsAdapter } from '@nestjs/platform-ws';
import { getClientIp } from '@supercharge/request-ip';
import { when } from 'jest-when';
import { DatastoreService } from 'src/repositories';
import {
  AllowCheckService,
  ProxyService,
  RateLimitService,
  TransactionService,
  TypeCheckService,
  VerseService,
  WSClient,
} from 'src/services';
import { WSClientManagerService } from 'src/services';
import { randomStr } from 'src/shared';
import { customRpcError } from 'src/entities';

jest.mock('@supercharge/request-ip');
jest.mock('src/shared/utils');

const context = { ip: '1.2.3.4', headers: { 'X-Dummy': 'test' } };
const icm = { headers: context.headers } as unknown as IncomingMessage;

const mockWebSocket = () => {
  const on = jest.fn();
  return {
    on,
    once: on,
    send: jest.fn(),
    close: jest.fn(),
  };
};

describe('WebSocket Service', () => {
  let moduleRef: TestingModule;
  let app: INestApplication;
  let datastore: DatastoreService;
  let proxy: ProxyService;
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
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useWebSocketAdapter(new WsAdapter(app));

    proxy = moduleRef.get<ProxyService>(ProxyService);
    datastore = moduleRef.get<DatastoreService>(DatastoreService);
  });

  let manager: WSClientManagerService;
  beforeAll(() => {
    const config = moduleRef.get<ConfigService>(ConfigService);
    when(jest.spyOn(config, 'get'))
      .calledWith('verseWSUrl' as any)
      .mockReturnValue('dummy');

    manager = new WSClientManagerService(config, proxy);
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  let server: ReturnType<typeof mockWebSocket>;
  let client: ReturnType<typeof mockWebSocket>;
  let ws: WSClient;
  beforeEach(async () => {
    server = mockWebSocket();
    client = mockWebSocket();

    jest.spyOn(manager, '_connectServer').mockImplementation(() => {
      return new Promise((resolve) => resolve(server as unknown as WebSocket));
    });
    (getClientIp as jest.Mock).mockReturnValue(context.ip);
    (randomStr as jest.Mock).mockReturnValueOnce('test-client');

    await manager.add(client as unknown as WebSocket, icm);
    ws = manager.get('test-client') as WSClient;
  });

  afterAll(async () => {
    datastore.close();
    manager.close();
  });

  describe('WSClientManagerService', () => {
    describe('add', () => {
      it('normally', async () => {
        expect(ws.proxy).toEqual(proxy);
        expect(ws.server).toEqual(server);
        expect(ws.client).toEqual(client);
        expect(ws.context).toEqual(context);
      });

      describe('sockets should be closed', () => {
        describe('when error happens', () => {
          it('error from server', async () => {
            expect(server.close).toBeCalledTimes(0);
            expect(client.close).toBeCalledTimes(0);

            const calls = server.on.mock.calls[0];
            expect(calls[0]).toEqual('error');
            calls[1](new Error('error'));

            expect(server.close).toBeCalledTimes(1);
            expect(client.close).toBeCalledTimes(1);
          });

          it('error from client', async () => {
            expect(server.close).toBeCalledTimes(0);
            expect(client.close).toBeCalledTimes(0);

            const calls = client.on.mock.calls[1];
            expect(calls[0]).toEqual('error');
            calls[1](new Error('error'));

            expect(server.close).toBeCalledTimes(1);
            expect(client.close).toBeCalledTimes(1);
          });
        });

        describe('when explicitly closed', () => {
          it('close from server', async () => {
            expect(server.close).toBeCalledTimes(0);
            expect(client.close).toBeCalledTimes(0);

            const calls = server.on.mock.calls[1];
            expect(calls[0]).toEqual('close');
            calls[1]();

            expect(server.close).toBeCalledTimes(1);
            expect(client.close).toBeCalledTimes(1);
          });

          it('close from client', async () => {
            expect(server.close).toBeCalledTimes(0);
            expect(client.close).toBeCalledTimes(0);

            const calls = client.on.mock.calls[2];
            expect(calls[0]).toEqual('close');
            calls[1]();

            expect(server.close).toBeCalledTimes(1);
            expect(client.close).toBeCalledTimes(1);
          });
        });
      });
    });
  });

  describe('WSClient', () => {
    let onServerMessage: (data: any) => Promise<void>;
    let onClientMessage: (data: any) => Promise<void>;
    beforeEach(() => {
      onServerMessage = server.on.mock.calls[2][1];
      onClientMessage = client.on.mock.calls[3][1];
    });

    describe('on server message', () => {
      it('should be pass-through to the client', async () => {
        expect(client.send).toBeCalledTimes(0);

        const message = JSON.stringify({ message: 'test message' });
        await onServerMessage(message);

        expect(client.send).toBeCalledWith(message);
      });

      it('should be returned to the caller of sendToServer()', async () => {
        const originalID = '1';
        const alternateID = 'alt';
        const request = { jsonrpc: '2.0', id: originalID, method: 'test' };
        const response = { jsonrpc: '2.0', id: alternateID, result: 'test' };

        expect(client.send).toBeCalledTimes(0);

        (randomStr as jest.Mock).mockReturnValueOnce(alternateID);
        const promise = ws.sendToServer(request);
        await onServerMessage(JSON.stringify(response));

        await expect(promise).resolves.toEqual({ ...response, id: originalID });
        expect(client.send).toBeCalledTimes(0);
      });
    });

    describe('on client message', () => {
      const request = { jsonrpc: '2.0', id: 1, method: 'test' };
      const response = { jsonrpc: '2.0', id: 1, result: 'test' };

      it('should be passed to ProxyService', async () => {
        const proxySpy = jest
          .spyOn(proxy, 'proxy')
          .mockImplementation(async () => ({ status: 200, data: response }));

        await onClientMessage(JSON.stringify(request));

        expect(proxySpy).toBeCalledWith(context, request, { ws });
        expect(client.send).toBeCalledWith(JSON.stringify(response));
      });

      it('should be returned `invalid request` error', async () => {
        await onClientMessage('');

        expect(client.send).toBeCalledWith(
          JSON.stringify({
            jsonrpc: '2.0',
            id: null,
            error: {
              code: -32700,
              message: 'invalid json format',
            },
          }),
        );
      });

      it('should be returned custom rpc error', async () => {
        const proxySpy = jest
          .spyOn(proxy, 'proxy')
          .mockImplementation(async () => {
            throw new Error('test error');
          });

        await onClientMessage(JSON.stringify(request));

        expect(proxySpy).toBeCalledWith(context, request, { ws });
        expect(client.send).toBeCalledWith(
          JSON.stringify(customRpcError('test error')),
        );
      });
    });
  });
});
