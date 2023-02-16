import { Test } from '@nestjs/testing';
import { HttpModule } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import {
  TransactionService,
  VerseService,
  AllowCheckService,
  WebhookService,
} from 'src/services';
import { BigNumber } from 'ethers';
import * as transactionAllowList from 'src/config/transactionAllowList';
import { AccessList } from 'ethers/lib/utils';
import { JsonrpcError } from 'src/entities';

describe('TransactionService', () => {
  let verseService: VerseService;
  let allowCheckService: AllowCheckService;
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
  const data =
    '0x1ee5c97d00000000000000000000000000000000000000000000000000000000006e421600000000000000000000000087c3ed02af9d6db56e03a35b67af25009078ad00000000000000000000000000ee903a26803819a6c79b18a827a78a4fa7d3355c';
  const accessList = [] as AccessList;
  const hash =
    '0xc6092b487b9e86b4ea22bf5e73cc0172ca37e938971e26aa70ec66f7be9dfcfc';
  const v = 0;
  const r =
    '0x79448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd028';
  const s =
    '0x743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239';
  const from = '0xaf395754eB6F542742784cE7702940C60465A46a';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [
        ConfigService,
        VerseService,
        AllowCheckService,
        TransactionService,
        WebhookService,
      ],
    })
      .useMocker((token) => {
        if (token === VerseService) {
          return {
            post: jest.fn(),
          };
        }
      })
      .compile();

    verseService = moduleRef.get<VerseService>(VerseService);
    allowCheckService = moduleRef.get<AllowCheckService>(AllowCheckService);
  });

  describe('checkAllowedTx', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    it('transaction does not have from', () => {
      jest.spyOn(allowCheckService, 'isAllowedDeploy').mockReturnValue(false);

      transactionAllowListMock.mockReturnValue([
        {
          fromList: ['*'],
          toList: ['*'],
        },
      ]);

      const transactionService = new TransactionService(
        verseService,
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

    it('deploy transaction(it does not have to) and is not allowed', () => {
      jest.spyOn(allowCheckService, 'isAllowedDeploy').mockReturnValue(false);

      transactionAllowListMock.mockReturnValue([
        {
          fromList: ['*'],
          toList: ['*'],
        },
      ]);

      const transactionService = new TransactionService(
        verseService,
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
        'deploy transaction is not allowed',
      );
    });

    it('deploy transaction(it does not have to) and is allowed', () => {
      jest.spyOn(allowCheckService, 'isAllowedDeploy').mockReturnValue(true);

      transactionAllowListMock.mockReturnValue([
        {
          fromList: ['*'],
          toList: ['*'],
        },
      ]);

      const transactionService = new TransactionService(
        verseService,
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

      expect(() => transactionService.checkAllowedTx(tx)).not.toThrow();
    });

    it('transaction has allowed_from and allowed_to', () => {
      jest.spyOn(allowCheckService, 'isAllowedDeploy').mockReturnValue(false);

      transactionAllowListMock.mockReturnValue([
        {
          fromList: ['*'],
          toList: ['*'],
        },
      ]);

      const transactionService = new TransactionService(
        verseService,
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
      jest.spyOn(allowCheckService, 'isAllowedDeploy').mockReturnValue(false);

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
        verseService,
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
      jest.spyOn(allowCheckService, 'isAllowedDeploy').mockReturnValue(false);

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
        verseService,
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
      jest.spyOn(allowCheckService, 'isAllowedDeploy').mockReturnValue(false);

      transactionAllowListMock.mockReturnValue([
        {
          fromList: ['*'],
          toList: ['*'],
          value: { gt: '1000000000000000000' },
        },
      ]);

      const transactionService = new TransactionService(
        verseService,
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
      jest.spyOn(allowCheckService, 'isAllowedDeploy').mockReturnValue(false);

      transactionAllowListMock.mockReturnValue([
        {
          fromList: ['*'],
          toList: ['*'],
          value: { gt: '1000000000000000000' },
        },
      ]);

      const transactionService = new TransactionService(
        verseService,
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

    it('eth_estimateGas is successful', async () => {
      const verseStatus = 200;
      const verseData = {
        jsonrpc: '2.0',
        id: 1,
        result: '0x5208',
      };
      const verseResponse = {
        status: verseStatus,
        data: verseData,
      };

      jest.spyOn(verseService, 'post').mockResolvedValue(verseResponse);

      transactionAllowListMock.mockReturnValue([
        {
          fromList: ['*'],
          toList: ['*'],
        },
      ]);

      const transactionService = new TransactionService(
        verseService,
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

    it('eth_estimateGas is not successful', async () => {
      const errMsg = 'insufficient balance for transfer';
      const errCode = -32602;
      const verseStatus = 200;
      const verseData = {
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32000,
          message: errMsg,
        },
      };
      const verseResponse = {
        status: verseStatus,
        data: verseData,
      };

      jest.spyOn(verseService, 'post').mockResolvedValue(verseResponse);

      transactionAllowListMock.mockReturnValue([
        {
          fromList: ['*'],
          toList: ['*'],
        },
      ]);

      const transactionService = new TransactionService(
        verseService,
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
        const error = new JsonrpcError(errMsg, errCode);
        expect(e).toEqual(error);
      }
    });
  });
});
