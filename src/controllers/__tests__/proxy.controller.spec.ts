import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { Response } from 'express';
import {
  TransactionService,
  VerseService,
  ProxyService,
  AllowCheckService,
  TypeCheckService,
  RateLimitService,
} from 'src/services';
import { ProxyController } from 'src/controllers';
import { DatastoreService } from 'src/datastore/services';

describe('ProxyController', () => {
  let typeCheckService: TypeCheckService;
  let configService: ConfigService;
  let proxyService: ProxyService;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [HttpModule],
      controllers: [ProxyController],
      providers: [
        ConfigService,
        VerseService,
        TransactionService,
        AllowCheckService,
        TypeCheckService,
        ProxyService,
        RateLimitService,
        DatastoreService,
        ConfigService,
      ],
    }).compile();

    configService = moduleRef.get<ConfigService>(ConfigService);
    typeCheckService = moduleRef.get<TypeCheckService>(TypeCheckService);
    proxyService = moduleRef.get<ProxyService>(ProxyService);

    jest.spyOn(proxyService, 'handleBatchRequest');
    jest.spyOn(proxyService, 'handleSingleRequest');
  });

  describe('post', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    it('verseReadNodeUrl is set', () => {
      const verseReadNodeUrl = 'http://localhost:8545';
      const ip = '127.0.0.1';
      const headers = { host: 'localhost' };
      const requestContext = {
        ip,
        headers,
      };
      const body = {
        jsonrpc: '2.0',
        method: 'net_version',
        params: [],
        id: 1,
      };
      const res = {
        send: () => {
          return;
        },
        status: (code: number) => res,
      } as Response;

      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        switch (key) {
          case 'verseReadNodeUrl':
            return verseReadNodeUrl;
        }
      });

      const controller = new ProxyController(
        configService,
        typeCheckService,
        proxyService,
      );
      const handler = jest.spyOn(controller, 'handler');

      expect(async () => controller.post(ip, headers, body, res)).not.toThrow();
      expect(handler).toHaveBeenCalledWith(true, requestContext, body, res);
    });

    it('verseReadNodeUrl is not set', () => {
      const verseReadNodeUrl = undefined;
      const ip = '127.0.0.1';
      const headers = { host: 'localhost' };
      const requestContext = {
        ip,
        headers,
      };
      const body = {
        jsonrpc: '2.0',
        method: 'net_version',
        params: [],
        id: 1,
      };
      const res = {
        send: () => {
          return;
        },
        status: (code: number) => res,
      } as Response;

      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        switch (key) {
          case 'verseReadNodeUrl':
            return verseReadNodeUrl;
        }
      });

      const controller = new ProxyController(
        configService,
        typeCheckService,
        proxyService,
      );
      const handler = jest.spyOn(controller, 'handler');

      expect(async () => controller.post(ip, headers, body, res)).not.toThrow();
      expect(handler).toHaveBeenCalledWith(false, requestContext, body, res);
    });
  });

  describe('postMaster', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    it('verseReadNodeUrl is set', () => {
      const verseReadNodeUrl = 'http://localhost:8545';
      const ip = '127.0.0.1';
      const headers = { host: 'localhost' };
      const requestContext = {
        ip,
        headers,
      };
      const body = {
        jsonrpc: '2.0',
        method: 'net_version',
        params: [],
        id: 1,
      };
      const res = {
        send: () => {
          return;
        },
        status: (code: number) => res,
      } as Response;

      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        switch (key) {
          case 'verseReadNodeUrl':
            return verseReadNodeUrl;
        }
      });

      const controller = new ProxyController(
        configService,
        typeCheckService,
        proxyService,
      );
      const handler = jest.spyOn(controller, 'handler');

      expect(async () =>
        controller.postMaster(ip, headers, body, res),
      ).not.toThrow();
      expect(handler).toHaveBeenCalledWith(false, requestContext, body, res);
    });

    it('verseReadNodeUrl is not set', () => {
      const verseReadNodeUrl = undefined;
      const ip = '127.0.0.1';
      const headers = { host: 'localhost' };
      const requestContext = {
        ip,
        headers,
      };
      const body = {
        jsonrpc: '2.0',
        method: 'net_version',
        params: [],
        id: 1,
      };
      const res = {
        send: () => {
          return;
        },
        status: (code: number) => res,
      } as Response;

      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        switch (key) {
          case 'verseReadNodeUrl':
            return verseReadNodeUrl;
        }
      });

      const controller = new ProxyController(
        configService,
        typeCheckService,
        proxyService,
      );
      const handler = jest.spyOn(controller, 'handler');

      expect(async () =>
        controller.postMaster(ip, headers, body, res),
      ).not.toThrow();
      expect(handler).toHaveBeenCalledWith(false, requestContext, body, res);
    });
  });

  describe('handler', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    it('body is JsonrpcArray', () => {
      const isUseReadNode = true;
      const ip = '127.0.0.1';
      const headers = { host: 'localhost' };
      const requestContext = {
        ip,
        headers,
      };
      const body = [
        {
          jsonrpc: '2.0',
          method: 'eth_sendRawTransaction',
          params: [
            '0xf8620180825208948626f6940e2eb28930efb4cef49b2d1f2c9c11998080831e84a2a06c33b39c89e987ad08bc2cab79243dbb2a44955d2539d4f5d58001ae9ab0a2caa06943316733bd0fd81a0630a9876f6f07db970b93f367427404aabd0621ea5ec1',
          ],
          id: 1,
        },
        {
          jsonrpc: '2.0',
          method: 'net_version',
          params: [],
          id: 1,
        },
      ];
      const res = {
        send: () => {
          return;
        },
        status: (code: number) => res,
      } as Response;

      jest
        .spyOn(typeCheckService, 'isJsonrpcArrayRequestBody')
        .mockReturnValue(true);
      const handleBatchRequestMock = jest.spyOn(
        proxyService,
        'handleBatchRequest',
      );
      const handleSingleRequestMock = jest.spyOn(
        proxyService,
        'handleSingleRequest',
      );

      const controller = moduleRef.get<ProxyController>(ProxyController);
      expect(async () =>
        controller.handler(isUseReadNode, requestContext, body, res),
      ).not.toThrow();
      expect(handleBatchRequestMock).toHaveBeenCalled();
      expect(handleSingleRequestMock).not.toHaveBeenCalled();
    });

    it('body is Jsonrpc', () => {
      const isUseReadNode = true;
      const ip = '127.0.0.1';
      const headers = { host: 'localhost' };
      const requestContext = {
        ip,
        headers,
      };
      const body = {
        jsonrpc: '2.0',
        method: 'net_version',
        params: [],
        id: 1,
      };
      const res = {
        send: () => {
          return;
        },
        status: (code: number) => res,
      } as Response;

      jest
        .spyOn(typeCheckService, 'isJsonrpcArrayRequestBody')
        .mockReturnValue(false);
      jest
        .spyOn(typeCheckService, 'isJsonrpcRequestBody')
        .mockReturnValue(true);
      const handleBatchRequestMock = jest.spyOn(
        proxyService,
        'handleBatchRequest',
      );
      const handleSingleRequestMock = jest.spyOn(
        proxyService,
        'handleSingleRequest',
      );

      const controller = moduleRef.get<ProxyController>(ProxyController);
      expect(async () =>
        controller.handler(isUseReadNode, requestContext, body, res),
      ).not.toThrow();
      expect(handleBatchRequestMock).not.toHaveBeenCalled();
      expect(handleSingleRequestMock).toHaveBeenCalled();
    });

    it('body is not Jsonrpc or JsonrpcArray', async () => {
      const isUseReadNode = true;
      const ip = '127.0.0.1';
      const headers = { host: 'localhost' };
      const requestContext = {
        ip,
        headers,
      };
      const body = {};
      const res = {
        send: () => {
          return;
        },
        status: (code: number) => res,
      } as Response;
      const errMsg = 'invalid request';

      jest
        .spyOn(typeCheckService, 'isJsonrpcArrayRequestBody')
        .mockReturnValue(false);
      jest
        .spyOn(typeCheckService, 'isJsonrpcRequestBody')
        .mockReturnValue(false);
      const handleBatchRequestMock = jest.spyOn(
        proxyService,
        'handleBatchRequest',
      );
      const handleSingleRequestMock = jest.spyOn(
        proxyService,
        'handleSingleRequest',
      );

      const controller = moduleRef.get<ProxyController>(ProxyController);

      await expect(
        controller.handler(isUseReadNode, requestContext, body, res),
      ).rejects.toThrow(errMsg);
      expect(handleBatchRequestMock).not.toHaveBeenCalled();
      expect(handleSingleRequestMock).not.toHaveBeenCalled();
    });
  });
});
