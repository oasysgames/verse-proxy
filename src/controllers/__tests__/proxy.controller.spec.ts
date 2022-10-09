import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BigNumber } from 'ethers';
import { AccessList } from 'ethers/lib/utils';
import { TransactionService, VerseService } from 'src/services';
import { ProxyController } from '../proxy.controller';
import { AllowCheckService } from 'src/shared/services/src';

const type = 2;
const chainId = 5;
const nonce = 3;
const maxPriorityFeePerGas = BigNumber.from('1500000000');
const maxFeePerGas = BigNumber.from('1500000018');
const gasPrice = undefined;
const gasLimit = BigNumber.from('21000');
const to = '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199';
const value = BigNumber.from('1000000000000');
const data = '0x';
const accessList = [] as AccessList;
const hash =
  '0xc6092b487b9e86b4ea22bf5e73cc0172ca37e938971e26aa70ec66f7be9dfcfc';
const v = 0;
const r = '0x79448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd028';
const s = '0x743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239';
const from = '0xaf395754eB6F542742784cE7702940C60465A46a';

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

describe('ProxyController', () => {
  let configService: ConfigService;
  let verseService: VerseService;
  let txService: TransactionService;
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
      ],
    })
      .useMocker((token) => {
        switch (token) {
          case ConfigService:
            return {
              get: jest.fn(),
            };
          case VerseService:
            return {
              post: jest.fn(),
            };
          case TransactionService:
            return {
              parseRawTx: jest.fn(),
              checkAllowedTx: jest.fn(),
              checkAllowedGas: jest.fn(),
            };
        }
      })
      .compile();

    configService = moduleRef.get<ConfigService>(ConfigService);
    verseService = moduleRef.get<VerseService>(VerseService);
    txService = moduleRef.get<TransactionService>(TransactionService);
  });

  describe('post', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    it('tx method is not eth_sendRawTransaction and successful', async () => {
      const allowedMethods: RegExp[] = [/^.*$/];
      const method = 'eth_call';
      const headers = { host: 'localhost' };
      const body = {
        jsonrpc: '2.0',
        id: 1,
        method: method,
        params: [tx, 'latest'],
      };
      const res = {
        jsonrpc: '2.0',
        id: 1,
        result: '0x',
      };
      jest.spyOn(configService, 'get').mockReturnValue(allowedMethods);
      jest.spyOn(verseService, 'post').mockResolvedValue(res);

      const controller = moduleRef.get<ProxyController>(ProxyController);

      const result = await controller.requestVerse(headers, body);
      expect(result).toBe(res);
      expect(jest.spyOn(txService, 'parseRawTx')).not.toHaveBeenCalled();
      expect(jest.spyOn(txService, 'checkAllowedTx')).not.toHaveBeenCalled();
      expect(jest.spyOn(txService, 'checkAllowedGas')).not.toHaveBeenCalled();
    });

    it('tx method is not allowed', async () => {
      const allowedMethods: RegExp[] = [/^eth_call$/];
      const method = 'eth_getTransactionReceipt';
      const headers = { host: 'localhost' };
      const body = {
        jsonrpc: '2.0',
        id: 1,
        method: method,
        params: [
          '0xc3a3a2feced276891d9658a62205ff049bab1e6e4e4d6ff500487e023fcb3d82',
        ],
      };
      const errMsg = `${method} is not allowed`;
      jest.spyOn(configService, 'get').mockReturnValue(allowedMethods);

      const controller = moduleRef.get<ProxyController>(ProxyController);

      try {
        await controller.requestVerse(headers, body);
      } catch (e) {
        const forbiddenError = new ForbiddenException(errMsg);
        expect(e).toEqual(forbiddenError);
      }
      expect(jest.spyOn(txService, 'parseRawTx')).not.toHaveBeenCalled();
      expect(jest.spyOn(txService, 'checkAllowedTx')).not.toHaveBeenCalled();
      expect(jest.spyOn(txService, 'checkAllowedGas')).not.toHaveBeenCalled();
    });

    it('tx method is eth_sendRawTransaction and checkAllowedTx is failed', async () => {
      const rawTx =
        '0x02f86f05038459682f008459682f12825208948626f6940e2eb28930efb4cef49b2d1f2c9c119985e8d4a5100080c080a079448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd029a0743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239';
      const allowedMethods: RegExp[] = [/^.*$/];
      const method = 'eth_sendRawTransaction';
      const headers = { host: 'localhost' };
      const body = {
        jsonrpc: '2.0',
        id: 1,
        method: method,
        params: [rawTx],
      };
      const errMsg = 'transaction is invalid';
      jest.spyOn(configService, 'get').mockReturnValue(allowedMethods);
      jest.spyOn(txService, 'parseRawTx').mockReturnValue(tx);
      jest.spyOn(txService, 'checkAllowedTx').mockImplementation(() => {
        throw new ForbiddenException(errMsg);
      });

      const controller = moduleRef.get<ProxyController>(ProxyController);

      try {
        await controller.requestVerse(headers, body);
      } catch (e) {
        const forbiddenError = new ForbiddenException(errMsg);
        expect(e).toEqual(forbiddenError);
      }
      expect(jest.spyOn(txService, 'parseRawTx')).toHaveBeenCalledWith(rawTx);
      expect(jest.spyOn(txService, 'checkAllowedTx')).toHaveBeenCalledWith(tx);
      expect(jest.spyOn(txService, 'checkAllowedGas')).not.toHaveBeenCalled();
    });

    it('tx method is eth_sendRawTransaction and checkAllowedGas is failed', async () => {
      const jsonrpc = '2.0';
      const id = 1;
      const rawTx =
        '0x02f86f05038459682f008459682f12825208948626f6940e2eb28930efb4cef49b2d1f2c9c119985e8d4a5100080c080a079448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd029a0743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239';
      const allowedMethods: RegExp[] = [/^.*$/];
      const method = 'eth_sendRawTransaction';
      const headers = { host: 'localhost' };
      const body = {
        jsonrpc: jsonrpc,
        id: id,
        method: method,
        params: [rawTx],
      };
      const errMsg = 'insufficient balance for transfer';
      jest.spyOn(configService, 'get').mockReturnValue(allowedMethods);
      jest.spyOn(txService, 'parseRawTx').mockReturnValue(tx);
      jest
        .spyOn(txService, 'checkAllowedGas')
        .mockRejectedValue(new ForbiddenException(errMsg));

      const controller = moduleRef.get<ProxyController>(ProxyController);

      try {
        await controller.requestVerse(headers, body);
      } catch (e) {
        const forbiddenError = new ForbiddenException(errMsg);
        expect(e).toEqual(forbiddenError);
      }
      expect(jest.spyOn(txService, 'parseRawTx')).toHaveBeenCalledWith(rawTx);
      expect(jest.spyOn(txService, 'checkAllowedTx')).toHaveBeenCalledWith(tx);
      expect(jest.spyOn(txService, 'checkAllowedGas')).toHaveBeenCalledWith(
        tx,
        jsonrpc,
        id,
      );
    });

    it('tx method is not eth_sendRawTransaction and successful', async () => {
      const allowedMethods: RegExp[] = [/^.*$/];
      const method = 'eth_sendRawTransaction';
      const headers = { host: 'localhost' };
      const body = {
        jsonrpc: '2.0',
        id: 1,
        method: method,
        params: [
          '0x02f86f05038459682f008459682f12825208948626f6940e2eb28930efb4cef49b2d1f2c9c119985e8d4a5100080c080a079448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd029a0743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239',
        ],
      };
      const res = {
        jsonrpc: '2.0',
        id: 1,
        result: '0x',
      };
      jest.spyOn(configService, 'get').mockReturnValue(allowedMethods);
      jest.spyOn(txService, 'parseRawTx').mockReturnValue(tx);
      jest.spyOn(verseService, 'post').mockResolvedValue(res);

      const controller = moduleRef.get<ProxyController>(ProxyController);

      const result = await controller.requestVerse(headers, body);
      expect(result).toBe(res);
    });
  });

  describe('checkMethod', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    it('All methods are allowed', () => {
      const allowedMethods: RegExp[] = [/^.*$/];
      const method = 'eth_getTransactionReceipt';
      jest.spyOn(configService, 'get').mockReturnValue(allowedMethods);

      const controller = moduleRef.get<ProxyController>(ProxyController);

      expect(() => controller.checkMethod(method)).not.toThrow();
    });

    it('Tx method is not allowed', () => {
      const allowedMethods: RegExp[] = [/^eth_call$/];
      const method = 'eth_getTransactionReceipt';
      jest.spyOn(configService, 'get').mockReturnValue(allowedMethods);

      const controller = moduleRef.get<ProxyController>(ProxyController);

      expect(() => controller.checkMethod(method)).toThrow(
        `${method} is not allowed`,
      );
    });
  });
});
