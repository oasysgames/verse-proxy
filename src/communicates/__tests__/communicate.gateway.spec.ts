import { INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CommunicateGateway } from '../communicate.gateway';
import { Socket, io } from 'socket.io-client';

async function createNestApp(...gateways: any): Promise<INestApplication> {
  const testingModule = await Test.createTestingModule({
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
    app = await createNestApp(CommunicateGateway);
    gateway = app.get<CommunicateGateway>(CommunicateGateway);
    ioClient = io('http://localhost:3000', {
      autoConnect: false,
      transports: ['websocket', 'pooling'],
    });
    app.listen(3000);
  });

  afterAll(async () => {
    await app.close();
  });

  it(`Should be defined`, () => {
    expect(gateway).toBeDefined();
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
});
