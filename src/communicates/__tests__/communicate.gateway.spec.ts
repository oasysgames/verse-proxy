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

  // it('executed method net_version', async () => {
  //   const body = {
  //     jsonrpc: '2.0',
  //     method: 'net_version',
  //     params: [],
  //     id: 1,
  //   };

  //   ioClient.connect();
  //   ioClient.emit('execute', body);
  //   await new Promise<void>((resolve) => {
  //     ioClient.on('connect', () => {
  //       console.log('Connected');
  //     });
  //     ioClient.on('executed', (data) => {
  //       expect(data.method).toBe('bnb_chainId');
  //       expect(data.response.error.message).toBe(
  //         'Method bnb_chainId is not allowed',
  //       );
  //       resolve();
  //     });
  //   });

  //   ioClient.disconnect();
  //   // const res = {
  //   //   send: () => {
  //   //     return;
  //   //   },
  //   //   status: (code: number) => res,
  //   // } as Response;

  //   // jest
  //   //   .spyOn(typeCheckService, 'isJsonrpcArrayRequestBody')
  //   //   .mockReturnValue(false);
  //   // jest.spyOn(typeCheckService, 'isJsonrpcRequestBody').mockReturnValue(true);
  //   // const handleBatchRequestMock = jest.spyOn(
  //   //   proxyService,
  //   //   'handleBatchRequest',
  //   // );
  //   // const handleSingleRequestMock = jest.spyOn(
  //   //   proxyService,
  //   //   'handleSingleRequest',
  //   // );

  //   // const controller = moduleRef.get<ProxyController>(ProxyController);
  //   // expect(async () =>
  //   //   controller.handler(isUseReadNode, requestContext, body, res),
  //   // ).not.toThrow();
  //   // expect(handleBatchRequestMock).not.toHaveBeenCalled();
  //   // expect(handleSingleRequestMock).toHaveBeenCalled();
  // });
});
