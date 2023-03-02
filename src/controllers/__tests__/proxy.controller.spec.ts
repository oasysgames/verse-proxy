import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
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
import { RedisService } from 'src/repositories';

describe('ProxyController', () => {
  let typeCheckService: TypeCheckService;
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
        RedisService,
        {
          provide: 'REDIS_CLIENT',
          useValue: {},
        },
      ],
    })
      .useMocker((token) => {
        switch (token) {
          case TypeCheckService:
            return {
              isJsonrpcArray: jest.fn(),
              isJsonrpc: jest.fn(),
            };
          case ProxyService:
            return {
              handleBatchRequest: jest.fn(),
              handleSingleRequest: jest.fn(),
            };
        }
      })
      .compile();

    typeCheckService = moduleRef.get<TypeCheckService>(TypeCheckService);
    proxyService = moduleRef.get<ProxyService>(ProxyService);
  });

  describe('post', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    it('body is JsonrpcArray', () => {
      const headers = { host: 'localhost' };
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
      expect(async () => controller.post(headers, body, res)).not.toThrow();
      expect(handleBatchRequestMock).toHaveBeenCalled();
      expect(handleSingleRequestMock).not.toHaveBeenCalled();
    });

    it('body is Jsonrpc', () => {
      const headers = { host: 'localhost' };
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
      expect(async () => controller.post(headers, body, res)).not.toThrow();
      expect(handleBatchRequestMock).not.toHaveBeenCalled();
      expect(handleSingleRequestMock).toHaveBeenCalled();
    });

    it('body is not Jsonrpc or JsonrpcArray', async () => {
      const headers = { host: 'localhost' };
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
      try {
        await controller.post(headers, body, res);
      } catch (e) {
        const error = new ForbiddenException(errMsg);
        expect(e).toEqual(error);
      }
      expect(handleBatchRequestMock).not.toHaveBeenCalled();
      expect(handleSingleRequestMock).not.toHaveBeenCalled();
    });
  });
});
