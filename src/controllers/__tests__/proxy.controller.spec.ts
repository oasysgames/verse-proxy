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
import { DatastoreService } from 'src/repositories';

describe('ProxyController', () => {
  let moduleRef: TestingModule;
  let proxyService: ProxyService;
  let controller: ProxyController;

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

    proxyService = moduleRef.get<ProxyService>(ProxyService);
    controller = new ProxyController(proxyService);
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  const ip = '127.0.0.1';
  const headers = { host: 'localhost' };
  const body = {
    jsonrpc: '2.0',
    method: 'net_version',
    params: [],
    id: 1,
  };

  it('post', async () => {
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    const proxySpy = jest
      .spyOn(proxyService, 'proxy')
      .mockResolvedValue({ status: 100, data: 'foo' });

    await controller.post(ip, headers, body, mockRes as unknown as Response);

    expect(mockRes.status).toHaveBeenCalledWith(100);
    expect(mockRes.send).toHaveBeenCalledWith('foo');
    expect(proxySpy).toHaveBeenCalledWith({ ip, headers }, body);
  });

  it('postMaster', async () => {
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    const proxySpy = jest
      .spyOn(proxyService, 'proxy')
      .mockResolvedValue({ status: 100, data: 'foo' });

    await controller.postMaster(
      ip,
      headers,
      body,
      mockRes as unknown as Response,
    );

    expect(mockRes.status).toHaveBeenCalledWith(100);
    expect(mockRes.send).toHaveBeenCalledWith('foo');
    expect(proxySpy).toHaveBeenCalledWith({ ip, headers }, body, {
      forceUseMasterNode: true,
    });
  });
});
