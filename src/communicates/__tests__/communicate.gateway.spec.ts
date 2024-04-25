import { Socket, io } from 'socket.io-client';

describe('Communicate gateway', () => {
  let ioClient: Socket;

  beforeEach(async () => {
    ioClient = io('http://localhost:3001', {
      autoConnect: false,
      transports: ['websocket', 'pooling'],
    });
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

  it('body is JsonrpcArray', async () => {
    const body = {
      jsonrpc: '2.0',
      method: 'eth_sendRawTransaction',
      params: [
        '0xf8620180825208948626f6940e2eb28930efb4cef49b2d1f2c9c11998080831e84a2a06c33b39c89e987ad08bc2cab79243dbb2a44955d2539d4f5d58001ae9ab0a2caa06943316733bd0fd81a0630a9876f6f07db970b93f367427404aabd0621ea5ec1',
      ],
      id: 1,
    };
    ioClient.connect();
    ioClient.emit('execute', { method: 'bnb_chainId', data: body });
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
});
