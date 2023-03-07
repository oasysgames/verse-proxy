import { Test } from '@nestjs/testing';
import { HttpModule } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import {
  TransactionService,
  VerseService,
  AllowCheckService,
  RateLimitService,
  WebhookService,
} from 'src/services';
import { DatastoreService } from 'src/repositories';
import { JsonrpcError } from 'src/entities';

describe('RateLimitService', () => {
  let allowCheckService: AllowCheckService;
  let datastoreService: DatastoreService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [
        ConfigService,
        VerseService,
        AllowCheckService,
        RateLimitService,
        WebhookService,
        TransactionService,
        DatastoreService,
      ],
    })
      .useMocker((token) => {
        switch (token) {
          case AllowCheckService:
            return {
              isUnlimitedTxRate: jest.fn(),
            };
          case DatastoreService:
            return {
              getTransactionHistoryCount: jest.fn(),
            };
        }
      })
      .compile();

    allowCheckService = moduleRef.get<AllowCheckService>(AllowCheckService);
    datastoreService = moduleRef.get<DatastoreService>(DatastoreService);
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('checkRateLimit', () => {
    it('from is unlimited TxRate', async () => {
      const from = '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199';
      const to = '0xaf395754eB6F542742784cE7702940C60465A46a';
      const methodId = '0x60806040';
      const rateLimit = {
        name: 'wildcard',
        interval: 1,
        limit: 1,
      };

      jest.spyOn(allowCheckService, 'isUnlimitedTxRate').mockReturnValue(true);
      const getTransactionHistoryCount = jest.spyOn(
        datastoreService,
        'getTransactionHistoryCount',
      );
      getTransactionHistoryCount.mockResolvedValue(10);

      const rateLimitService = new RateLimitService(
        datastoreService,
        allowCheckService,
      );

      expect(
        async () =>
          await rateLimitService.checkRateLimit(from, to, methodId, rateLimit),
      ).not.toThrow();
      expect(getTransactionHistoryCount).not.toHaveBeenCalled();
    });

    it('tx count is over limit', async () => {
      const from = '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199';
      const to = '0xaf395754eB6F542742784cE7702940C60465A46a';
      const methodId = '0x60806040';
      const rateLimit = {
        name: 'wildcard',
        interval: 1,
        limit: 1,
      };

      jest.spyOn(allowCheckService, 'isUnlimitedTxRate').mockReturnValue(false);
      const getTransactionHistoryCount = jest.spyOn(
        datastoreService,
        'getTransactionHistoryCount',
      );
      getTransactionHistoryCount.mockResolvedValue(10);

      const rateLimitService = new RateLimitService(
        datastoreService,
        allowCheckService,
      );
      const error = new JsonrpcError(
        `The number of allowed transacting has been exceeded. Wait ${rateLimit.interval} seconds before transacting.`,
        -32602,
      );

      try {
        await rateLimitService.checkRateLimit(from, to, methodId, rateLimit);
      } catch (e) {
        expect(e).toEqual(error);
        expect(getTransactionHistoryCount).toHaveBeenCalled();
      }
    });

    it('tx count is less limit', async () => {
      const from = '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199';
      const to = '0xaf395754eB6F542742784cE7702940C60465A46a';
      const methodId = '0x60806040';
      const rateLimit = {
        name: 'wildcard',
        interval: 1,
        limit: 1,
      };

      jest.spyOn(allowCheckService, 'isUnlimitedTxRate').mockReturnValue(false);
      const getTransactionHistoryCount = jest.spyOn(
        datastoreService,
        'getTransactionHistoryCount',
      );
      getTransactionHistoryCount.mockResolvedValue(0);

      const rateLimitService = new RateLimitService(
        datastoreService,
        allowCheckService,
      );

      expect(
        async () =>
          await rateLimitService.checkRateLimit(from, to, methodId, rateLimit),
      ).not.toThrow();
      expect(getTransactionHistoryCount).toHaveBeenCalled();
    });
  });
});
