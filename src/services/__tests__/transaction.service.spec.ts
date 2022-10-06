import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { TransactionService } from '../transaction.service';
import { AllowCheckService } from '../../shared/services/src';
import { BigNumber } from 'ethers';
import * as transactionAllowList from 'src/config/transactionAllowList';
import { AccessList } from 'ethers/lib/utils';
import { ForbiddenException } from '@nestjs/common';

describe('TransactionService', () => {
  let httpService: HttpService;
  let configService: ConfigService;
  const allowCheckService = new AllowCheckService();
  const transactionAllowListMock = jest.spyOn(
    transactionAllowList,
    'getTxAllowList',
  );

  const type = 2;
  const chainId = 5;
  const nonce = 3;
  const maxPriorityFeePerGas = BigNumber.from('1500000000');
  const maxFeePerGas = BigNumber.from('1500000018');
  const gasPrice = undefined;
  const gasLimit = BigNumber.from('21000');
  const to = '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199';
  let value = BigNumber.from('1000000000000');
  const data = '0x';
  const accessList = [] as AccessList;
  const hash =
    '0xc6092b487b9e86b4ea22bf5e73cc0172ca37e938971e26aa70ec66f7be9dfcfc';
  const v = 0;
  const r =
    '0x79448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd028';
  const s =
    '0x743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239';
  const from = '0xaf395754eB6F542742784cE7702940C60465A46a';

  describe('checkAllowedTx', () => {
    beforeEach(async () => {
      jest.resetAllMocks();
      const moduleRef = await Test.createTestingModule({
        providers: [
          {
            provide: HttpService,
            useValue: {
              post: jest.fn(() =>
                of({
                  data: {
                    jsonrpc: '2.0',
                    id: 1,
                    result: '0x',
                  },
                }),
              ),
            },
          },
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => {
                return 'http://localhost:8545';
              }),
            },
          },
        ],
      }).compile();

      httpService = moduleRef.get<HttpService>(HttpService);
      configService = moduleRef.get<ConfigService>(ConfigService);
    });

    it('transaction does not have from', () => {
      transactionAllowListMock.mockReturnValue([
        {
          fromList: ['*'],
          toList: ['*'],
        },
      ]);

      const transactionService = new TransactionService(
        httpService,
        configService,
        allowCheckService,
      );

      const tx = {
        type,
        chainId,
        nonce,
        maxPriorityFeePerGas,
        maxFeePerGas,
        gasPrice,
        gasLimit,
        to,
        value,
        data,
        accessList,
        hash,
        v,
        r,
        s,
      };

      expect(() => transactionService.checkAllowedTx(tx)).toThrow(
        'transaction is invalid',
      );
    });

    it('transaction does not have to', () => {
      transactionAllowListMock.mockReturnValue([
        {
          fromList: ['*'],
          toList: ['*'],
        },
      ]);

      const transactionService = new TransactionService(
        httpService,
        configService,
        allowCheckService,
      );

      const tx = {
        type,
        chainId,
        nonce,
        maxPriorityFeePerGas,
        maxFeePerGas,
        gasPrice,
        gasLimit,
        value,
        data,
        accessList,
        hash,
        v,
        r,
        s,
        from,
      };

      expect(() => transactionService.checkAllowedTx(tx)).toThrow(
        'transaction is invalid',
      );
    });

    it('transaction has allowed_from and allowed_to', () => {
      transactionAllowListMock.mockReturnValue([
        {
          fromList: ['*'],
          toList: ['*'],
        },
      ]);

      const transactionService = new TransactionService(
        httpService,
        configService,
        allowCheckService,
      );

      const tx = {
        type,
        chainId,
        nonce,
        maxPriorityFeePerGas,
        maxFeePerGas,
        gasPrice,
        gasLimit,
        to,
        value,
        data,
        accessList,
        hash,
        v,
        r,
        s,
        from,
      };

      expect(() => transactionService.checkAllowedTx(tx)).not.toThrow();
    });

    it('transaction has not_allowed_from', () => {
      transactionAllowListMock.mockReturnValue([
        {
          fromList: [
            '!0xaf395754eB6F542742784cE7702940C60465A46a',
            '0xaf395754eB6F542742784cE7702940C60465A46c',
          ],
          toList: ['*'],
        },
      ]);

      const transactionService = new TransactionService(
        httpService,
        configService,
        allowCheckService,
      );

      const tx = {
        type,
        chainId,
        nonce,
        maxPriorityFeePerGas,
        maxFeePerGas,
        gasPrice,
        gasLimit,
        to,
        value,
        data,
        accessList,
        hash,
        v,
        r,
        s,
        from,
      };

      expect(() => transactionService.checkAllowedTx(tx)).toThrow(
        'transaction is not allowed',
      );
    });

    it('transaction has not_allowed_to', () => {
      transactionAllowListMock.mockReturnValue([
        {
          fromList: ['*'],
          toList: [
            '!0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
            '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1190',
          ],
        },
      ]);

      const transactionService = new TransactionService(
        httpService,
        configService,
        allowCheckService,
      );

      const tx = {
        type,
        chainId,
        nonce,
        maxPriorityFeePerGas,
        maxFeePerGas,
        gasPrice,
        gasLimit,
        to,
        value,
        data,
        accessList,
        hash,
        v,
        r,
        s,
        from,
      };

      expect(() => transactionService.checkAllowedTx(tx)).toThrow(
        'transaction is not allowed',
      );
    });

    it('transaction has allowed_from and allowed_to, but does not have allowed_value', () => {
      transactionAllowListMock.mockReturnValue([
        {
          fromList: ['*'],
          toList: ['*'],
          value: { gt: '1000000000000000000' },
        },
      ]);

      const transactionService = new TransactionService(
        httpService,
        configService,
        allowCheckService,
      );

      const tx = {
        type,
        chainId,
        nonce,
        maxPriorityFeePerGas,
        maxFeePerGas,
        gasPrice,
        gasLimit,
        to,
        value,
        data,
        accessList,
        hash,
        v,
        r,
        s,
        from,
      };

      expect(() => transactionService.checkAllowedTx(tx)).toThrow(
        'transaction is not allowed',
      );
    });

    it('transaction has allowed_from and allowed_to, allowed_value', () => {
      transactionAllowListMock.mockReturnValue([
        {
          fromList: ['*'],
          toList: ['*'],
          value: { gt: '1000000000000000000' },
        },
      ]);

      const transactionService = new TransactionService(
        httpService,
        configService,
        allowCheckService,
      );

      value = BigNumber.from('1000000000000000001');
      const tx = {
        type,
        chainId,
        nonce,
        maxPriorityFeePerGas,
        maxFeePerGas,
        gasPrice,
        gasLimit,
        to,
        value,
        data,
        accessList,
        hash,
        v,
        r,
        s,
        from,
      };

      expect(() => transactionService.checkAllowedTx(tx)).not.toThrow();
    });
  });

  describe('checkAllowedGas', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    it('eth_call is successful', async () => {
      const moduleRef = await Test.createTestingModule({
        providers: [
          {
            provide: HttpService,
            useValue: {
              post: jest.fn(() =>
                of({
                  data: {
                    jsonrpc: '2.0',
                    id: 1,
                    result: '0x',
                  },
                }),
              ),
            },
          },
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => {
                return 'http://localhost:8545';
              }),
            },
          },
        ],
      }).compile();

      httpService = moduleRef.get<HttpService>(HttpService);
      configService = moduleRef.get<ConfigService>(ConfigService);

      transactionAllowListMock.mockReturnValue([
        {
          fromList: ['*'],
          toList: ['*'],
        },
      ]);

      const transactionService = new TransactionService(
        httpService,
        configService,
        allowCheckService,
      );
      const jsonrpc = '2.0';
      const id = 1;
      const tx = {
        type,
        chainId,
        nonce,
        maxPriorityFeePerGas,
        maxFeePerGas,
        gasPrice,
        gasLimit,
        to,
        value,
        data,
        accessList,
        hash,
        v,
        r,
        s,
        from,
      };

      expect(
        async () => await transactionService.checkAllowedGas(tx, jsonrpc, id),
      ).not.toThrow();
    });

    it('eth_call is not successful', async () => {
      const errMsg = 'insufficient balance for transfer';
      const moduleRef = await Test.createTestingModule({
        providers: [
          {
            provide: HttpService,
            useValue: {
              post: jest.fn(() =>
                of({
                  data: {
                    jsonrpc: '2.0',
                    id: 1,
                    error: {
                      code: -32000,
                      message: errMsg,
                    },
                  },
                }),
              ),
            },
          },
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => {
                return 'http://localhost:8545';
              }),
            },
          },
        ],
      }).compile();

      httpService = moduleRef.get<HttpService>(HttpService);
      configService = moduleRef.get<ConfigService>(ConfigService);

      transactionAllowListMock.mockReturnValue([
        {
          fromList: ['*'],
          toList: ['*'],
        },
      ]);

      const transactionService = new TransactionService(
        httpService,
        configService,
        allowCheckService,
      );
      const jsonrpc = '2.0';
      const id = 1;
      const tx = {
        type,
        chainId,
        nonce,
        maxPriorityFeePerGas,
        maxFeePerGas,
        gasPrice,
        gasLimit,
        to,
        value,
        data,
        accessList,
        hash,
        v,
        r,
        s,
        from,
      };

      try {
        await transactionService.checkAllowedGas(tx, jsonrpc, id);
      } catch (e) {
        const forbiddenError = new ForbiddenException(errMsg);
        expect(e).toEqual(forbiddenError);
      }
    });
  });
});
