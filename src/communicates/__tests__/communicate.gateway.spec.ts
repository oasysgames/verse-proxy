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
import { CommunicateService } from 'src/services/communicate.service';
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
      CommunicateService
    ],
  }).compile();
  testingModule.useLogger(new Logger());
  const app = testingModule.createNestApplication();
  app.useWebSocketAdapter(new WsAdapter(app) as any);
  return app;
}

describe('Communicate gateway', () => {
  let app: INestApplication;
  let ws: WebSocket;
  let subscriptionId: string;

  it('This test should be pass', (done) => {
    done();
  });

  // The test will need a connection to L1 node which can not pass review Bot

  beforeAll(async () => {
    app = await createNestApp();
    await app.listen(3000);
  });

  beforeEach(async () => {
    await new Promise((resolve, reject) => {
      ws = new WebSocket('ws://localhost:3000');
      ws.on('open', resolve);
      ws.on('error', reject);
    });
  });

  afterEach(async () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
      await new Promise<void>((resolve) => ws.on('close', resolve));
    }
  });

  afterAll(async () => {
    await app.close();
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
          const dataString = message.toString();
          const data = JSON.parse(dataString);
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

  it('execute method eth_getBlockByNumber', async () => {
    const body = {
      method: 'eth_getBlockByNumber',
      params: ['0x548', true],
      id: 1,
      jsonrpc: '2.0',
    };
    await new Promise<void>((resolve, reject) => {
      ws.once('message', async (message) => {
        try {
          const data = JSON.parse(message.toString());
          expect(data.result).toBeDefined();
          resolve();
        } catch (error) {
          reject(error);
        }
      });
      ws.send(JSON.stringify(body));
    });
  });

  it('execute method eth_subscribe', async () => {
    const body = {
      method: 'eth_subscribe',
      params: ['newPendingTransactions'],
      id: 1,
      jsonrpc: '2.0',
    };
    await new Promise<void>((resolve, reject) => {
      ws.once('message', async (message) => {
        try {
          const data = JSON.parse(message.toString());
          expect(data.result).toBeDefined();
          subscriptionId = data.result;
          resolve();
        } catch (error) {
          reject(error);
        }
      });
      ws.send(JSON.stringify(body));
    });
  });

  it('execute method eth_unsubscribe', async () => {
    const body = {
      method: 'eth_unsubscribe',
      params: [subscriptionId],
      id: 1,
      jsonrpc: '2.0',
    };
    await new Promise<void>((resolve, reject) => {
      ws.once('message', async (message) => {
        try {
          const data = JSON.parse(message.toString());
          expect(data.result).toBeDefined();
          resolve();
        } catch (error) {
          reject(error);
        }
      });
      ws.send(JSON.stringify(body));
    });
  });

  // it('execute method eth_sendRawTransaction', async () => {
  //   const body = {
  //     method: 'eth_sendRawTransaction',

  //     // rawTransaction will not work on your local node, try to create it yourself
  //     params: [
  //       '0xf8aa01843b9aca0082854e945fbdb2315678afecb367f032d93f642f64180aa380b84440c10f19000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb922660000000000000000000000000000000000000000000000000de0b6b3a7640000826095a08e05a3b4b48dc980b7dae6968d38d1c6886a500dca4f34c626b453ce78ff2114a02c0fe207c532a7e8d3108067a752befb184427333e7bf51439b6c18713f824b1',
  //     ],
  //     id: 1,
  //     jsonrpc: '2.0',
  //   };
  //   await new Promise<void>((resolve, reject) => {
  //     ws.once('message', async (message) => {
  //       try {
  //         const data = JSON.parse(message.toString());
  //         expect(data.result).toBeDefined();
  //         resolve();
  //       } catch (error) {
  //         reject(error);
  //       }
  //     });
  //     ws.send(JSON.stringify(body));
  //   });
  // });

  // it('should throw rate limit error', async () => {
  //   const body = {
  //     method: 'eth_sendRawTransaction',

  //     // rawTransaction will not work on your local node, try to create it yourself
  //     params: [
  //       '0xf8aa02843b9aca0082854e945fbdb2315678afecb367f032d93f642f64180aa380b84440c10f19000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb922660000000000000000000000000000000000000000000000000de0b6b3a7640000826095a043611213754798611c821566d2a99f8a657865a80c4e7d04b3a0755d737cd539a077dd8f4becf0b82a98cb50a8d9b6e3384c5dadf39b6d7f7d87dc5dd35083b46a',
  //     ],
  //     id: 1,
  //     jsonrpc: '2.0',
  //   };
  //   await new Promise<void>((resolve, reject) => {
  //     ws.once('message', async (message) => {
  //       try {
  //         const data = JSON.parse(message.toString());
  //         expect(data.error).toBeDefined();
  //         expect(data.error.message).toBe(
  //           'The number of allowed transacting has been exceeded. Wait 30000 seconds before transacting.',
  //         );
  //         resolve();
  //       } catch (error) {
  //         reject(error);
  //       }
  //     });
  //     ws.send(JSON.stringify(body));
  //   });
  // });
});
