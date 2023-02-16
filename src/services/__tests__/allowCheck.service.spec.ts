import { Test } from '@nestjs/testing';
import { BigNumber } from 'ethers';
import { AccessList } from 'ethers/lib/utils';
import { HttpModule } from '@nestjs/axios';
import {
  TransactionAllow,
  ComparisonOperation,
} from 'src/config/transactionAllowList';
import { AllowCheckService, WebhookService } from 'src/services';
import * as transactionAllowList from 'src/config/transactionAllowList';

describe('AllowCheckService', () => {
  let webhookService: WebhookService;

  const type = 2;
  const chainId = 5;
  const nonce = 3;
  const maxPriorityFeePerGas = BigNumber.from('1500000000');
  const maxFeePerGas = BigNumber.from('1500000018');
  const gasPrice = undefined;
  const gasLimit = BigNumber.from('21000');
  const to = '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199';
  const value = BigNumber.from('1000000000000');
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
      providers: [WebhookService],
    })
      .useMocker((token) => {
        if (token === WebhookService) {
          return {
            post: jest.fn(),
          };
        }
      })
      .compile();

    webhookService = moduleRef.get<WebhookService>(WebhookService);
  });

  describe('isAllowedString', () => {
    const allowCheckService = new AllowCheckService(webhookService);

    test('allowPattern equals input', () => {
      const allowPattern = '0xaf395754eB6F542742784cE7702940C60465A46a';
      const input = '0xaf395754eB6F542742784cE7702940C60465A46a';

      const result = allowCheckService.isAllowedString(allowPattern, input);
      expect(result).toBe(true);
    });

    test('allowPattern does not equal input', () => {
      const allowPattern = '0xaf395754eB6F542742784cE7702940C60465A46c';
      const input = '0xaf395754eB6F542742784cE7702940C60465A46a';

      const result = allowCheckService.isAllowedString(allowPattern, input);
      expect(result).toBe(false);
    });

    test('allowPattern is wildcard', () => {
      const allowPattern = '*';
      const input = '0xaf395754eB6F542742784cE7702940C60465A46a';

      const result = allowCheckService.isAllowedString(allowPattern, input);
      expect(result).toBe(true);
    });

    test('allowPattern is denial of input', () => {
      const allowPattern = '!0xaf395754eB6F542742784cE7702940C60465A46a';
      const input = '0xaf395754eB6F542742784cE7702940C60465A46a';

      const result = allowCheckService.isAllowedString(allowPattern, input);
      expect(result).toBe(false);
    });

    test('allowPattern is not denial of input', () => {
      const allowPattern = '!0xaf395754eB6F542742784cE7702940C60465A46a';
      const input = '0xaf395754eB6F542742784cE7702940C60465A46a';

      const result = allowCheckService.isAllowedString(allowPattern, input);
      expect(result).toBe(false);
    });
  });

  describe('isAllowedFrom', () => {
    const allowCheckService = new AllowCheckService(webhookService);

    test('fromList is wildcard', () => {
      const condition: TransactionAllow = {
        fromList: ['*'],
        toList: ['*'],
      };
      const from = '0xaf395754eB6F542742784cE7702940C60465A46a';

      const result = allowCheckService.isAllowedFrom(condition, from);
      expect(result).toBe(true);
    });

    test('fromList includes from', () => {
      const condition: TransactionAllow = {
        fromList: [
          '0xaf395754eB6F542742784cE7702940C60465A46c',
          '0xaf395754eB6F542742784cE7702940C60465A46a',
        ],
        toList: ['*'],
      };
      const from = '0xaf395754eB6F542742784cE7702940C60465A46a';

      const result = allowCheckService.isAllowedFrom(condition, from);
      expect(result).toBe(true);
    });

    test('fromList does not include from', () => {
      const condition: TransactionAllow = {
        fromList: [
          '0xaf395754eB6F542742784cE7702940C60465A46c',
          '0xaf395754eB6F542742784cE7702940C60465A46d',
        ],
        toList: ['*'],
      };
      const from = '0xaf395754eB6F542742784cE7702940C60465A46a';

      const result = allowCheckService.isAllowedFrom(condition, from);
      expect(result).toBe(false);
    });
  });

  describe('isAllowedTo', () => {
    const allowCheckService = new AllowCheckService(webhookService);

    test('toList is wildcard', () => {
      const condition: TransactionAllow = {
        fromList: ['*'],
        toList: ['*'],
      };
      const to = '0xaf395754eB6F542742784cE7702940C60465A46a';

      const result = allowCheckService.isAllowedTo(condition, to);
      expect(result).toBe(true);
    });

    test('toList includes to', () => {
      const condition: TransactionAllow = {
        fromList: ['*'],
        toList: [
          '0xaf395754eB6F542742784cE7702940C60465A46c',
          '0xaf395754eB6F542742784cE7702940C60465A46a',
        ],
      };
      const to = '0xaf395754eB6F542742784cE7702940C60465A46a';

      const result = allowCheckService.isAllowedTo(condition, to);
      expect(result).toBe(true);
    });

    test('toList does not include to', () => {
      const condition: TransactionAllow = {
        fromList: ['*'],
        toList: [
          '0xaf395754eB6F542742784cE7702940C60465A46c',
          '0xaf395754eB6F542742784cE7702940C60465A46d',
        ],
      };
      const to = '0xaf395754eB6F542742784cE7702940C60465A46a';

      const result = allowCheckService.isAllowedTo(condition, to);
      expect(result).toBe(false);
    });
  });

  describe('isAllowedDeploy', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    test('from is not included in deployAllowList', () => {
      const getDeployAllowListMock = jest.spyOn(
        transactionAllowList,
        'getDeployAllowList',
      );
      getDeployAllowListMock.mockReturnValue([
        '0xaf395754eB6F542742784cE7702940C60465A46a',
        '0xaf395754eB6F542742784cE7702940C60465A46d',
      ]);

      const allowCheckService = new AllowCheckService(webhookService);

      const from = '0xaf395754eB6F542742784cE7702940C60465A46c';
      const result = allowCheckService.isAllowedDeploy(from);
      expect(result).toBe(false);
    });

    test('from is not allowed in deployAllowList', () => {
      const getDeployAllowListMock = jest.spyOn(
        transactionAllowList,
        'getDeployAllowList',
      );
      getDeployAllowListMock.mockReturnValue([
        '!0xaf395754eB6F542742784cE7702940C60465A46c',
        '0xaf395754eB6F542742784cE7702940C60465A46a',
      ]);

      const allowCheckService = new AllowCheckService(webhookService);

      const from = '0xaf395754eB6F542742784cE7702940C60465A46c';
      const result = allowCheckService.isAllowedDeploy(from);
      expect(result).toBe(false);
    });

    test('from is allowed in deployAllowList', () => {
      const getDeployAllowListMock = jest.spyOn(
        transactionAllowList,
        'getDeployAllowList',
      );
      getDeployAllowListMock.mockReturnValue([
        '!0xaf395754eB6F542742784cE7702940C60465A46c',
        '0xaf395754eB6F542742784cE7702940C60465A46a',
      ]);

      const allowCheckService = new AllowCheckService(webhookService);

      const from = '0xaf395754eB6F542742784cE7702940C60465A46a';
      const result = allowCheckService.isAllowedDeploy(from);
      expect(result).toBe(true);
    });

    test('deployAllowList has wildcard', () => {
      const getDeployAllowListMock = jest.spyOn(
        transactionAllowList,
        'getDeployAllowList',
      );
      getDeployAllowListMock.mockReturnValue(['*']);

      const allowCheckService = new AllowCheckService(webhookService);

      const from = '0xaf395754eB6F542742784cE7702940C60465A46c';
      const result = allowCheckService.isAllowedDeploy(from);
      expect(result).toBe(true);
    });
  });

  describe('isAllowedContractMethod', () => {
    const allowCheckService = new AllowCheckService(webhookService);

    test('contractList is undefined', () => {
      const contractList = undefined;
      const to = '0xaf395754eB6F542742784cE7702940C60465A46c';
      const methodId = '0x095ea7b3'; // approve(address,uint256)

      const result = allowCheckService.isAllowedContractMethod(
        contractList,
        to,
        methodId,
      );
      expect(result).toBe(true);
    });

    test('contractList is {}', () => {
      const contractList = {};
      const to = '0xaf395754eB6F542742784cE7702940C60465A46c';
      const methodId = '0x095ea7b3'; // approve(address,uint256)

      const result = allowCheckService.isAllowedContractMethod(
        contractList,
        to,
        methodId,
      );
      expect(result).toBe(true);
    });

    test('Contract(to) is not at contractList', () => {
      const contractList = {
        '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92265': [
          'approve(address,uint256)',
          'transfer(address,uint256)',
        ],
      };
      const to = '0xaf395754eB6F542742784cE7702940C60465A46c';
      const methodId = '0x095ea7b3'; // approve(address,uint256)

      const result = allowCheckService.isAllowedContractMethod(
        contractList,
        to,
        methodId,
      );
      expect(result).toBe(false);
    });

    test('Contract(to) is at contractList and allowedMethods are []', () => {
      const contractList = {
        '0xaf395754eB6F542742784cE7702940C60465A46c': [],
      };
      const to = '0xaf395754eB6F542742784cE7702940C60465A46c';
      const methodId = '0x095ea7b3'; // approve(address,uint256)

      const result = allowCheckService.isAllowedContractMethod(
        contractList,
        to,
        methodId,
      );
      expect(result).toBe(false);
    });

    test('Contract(to) is at contractList and allowedMethods are not there', () => {
      const contractList = {
        '0xaf395754eB6F542742784cE7702940C60465A46c': [
          'transfer(address,uint256)',
        ],
      };
      const to = '0xaf395754eB6F542742784cE7702940C60465A46c';
      const methodId = '0x095ea7b3'; // approve(address,uint256)

      const result = allowCheckService.isAllowedContractMethod(
        contractList,
        to,
        methodId,
      );
      expect(result).toBe(false);
    });

    test('Contract(to) is at contractList and allowedMethods are there', () => {
      const contractList = {
        '0xaf395754eB6F542742784cE7702940C60465A46c': [
          'approve(address,uint256)',
          'transfer(address,uint256)',
        ],
      };
      const to = '0xaf395754eB6F542742784cE7702940C60465A46c';
      const methodId = '0x095ea7b3'; // approve(address,uint256)

      const result = allowCheckService.isAllowedContractMethod(
        contractList,
        to,
        methodId,
      );
      expect(result).toBe(true);
    });
  });

  describe('isAllowedValue', () => {
    const allowCheckService = new AllowCheckService(webhookService);

    test('value == eq', () => {
      const valueCondition: ComparisonOperation = {
        eq: '1000000000000000000',
      };
      const value = BigNumber.from('1000000000000000000');

      const result = allowCheckService.isAllowedValue(valueCondition, value);
      expect(result).toBe(true);
    });

    test('value != eq', () => {
      const valueCondition: ComparisonOperation = {
        eq: '1000000000000000000',
      };
      const value = BigNumber.from('900000000000000000');

      const result = allowCheckService.isAllowedValue(valueCondition, value);
      expect(result).toBe(false);
    });

    test('value != nq', () => {
      const valueCondition: ComparisonOperation = {
        nq: '1000000000000000000',
      };
      const value = BigNumber.from('900000000000000000');

      const result = allowCheckService.isAllowedValue(valueCondition, value);
      expect(result).toBe(true);
    });

    test('value == nq', () => {
      const valueCondition: ComparisonOperation = {
        nq: '1000000000000000000',
      };
      const value = BigNumber.from('1000000000000000000');

      const result = allowCheckService.isAllowedValue(valueCondition, value);
      expect(result).toBe(false);
    });

    test('value > gt', () => {
      const valueCondition: ComparisonOperation = {
        gt: '900000000000000000',
      };
      const value = BigNumber.from('1000000000000000000');

      const result = allowCheckService.isAllowedValue(valueCondition, value);
      expect(result).toBe(true);
    });

    test('value == gt', () => {
      const valueCondition: ComparisonOperation = {
        gt: '1000000000000000000',
      };
      const value = BigNumber.from('1000000000000000000');

      const result = allowCheckService.isAllowedValue(valueCondition, value);
      expect(result).toBe(false);
    });

    test('value < gt', () => {
      const valueCondition: ComparisonOperation = {
        gt: '1000000000000000000',
      };
      const value = BigNumber.from('900000000000000000');

      const result = allowCheckService.isAllowedValue(valueCondition, value);
      expect(result).toBe(false);
    });

    test('value > gte', () => {
      const valueCondition: ComparisonOperation = {
        gte: '900000000000000000',
      };
      const value = BigNumber.from('1000000000000000000');

      const result = allowCheckService.isAllowedValue(valueCondition, value);
      expect(result).toBe(true);
    });

    test('value == gte', () => {
      const valueCondition: ComparisonOperation = {
        gte: '1000000000000000000',
      };
      const value = BigNumber.from('1000000000000000000');

      const result = allowCheckService.isAllowedValue(valueCondition, value);
      expect(result).toBe(true);
    });

    test('value < gte', () => {
      const valueCondition: ComparisonOperation = {
        gte: '1000000000000000000',
      };
      const value = BigNumber.from('900000000000000000');

      const result = allowCheckService.isAllowedValue(valueCondition, value);
      expect(result).toBe(false);
    });

    test('value < lt', () => {
      const valueCondition: ComparisonOperation = {
        lt: '1000000000000000000',
      };
      const value = BigNumber.from('900000000000000000');

      const result = allowCheckService.isAllowedValue(valueCondition, value);
      expect(result).toBe(true);
    });

    test('value == lt', () => {
      const valueCondition: ComparisonOperation = {
        lt: '1000000000000000000',
      };
      const value = BigNumber.from('1000000000000000000');

      const result = allowCheckService.isAllowedValue(valueCondition, value);
      expect(result).toBe(false);
    });

    test('value > lt', () => {
      const valueCondition: ComparisonOperation = {
        lt: '900000000000000000',
      };
      const value = BigNumber.from('1000000000000000000');

      const result = allowCheckService.isAllowedValue(valueCondition, value);
      expect(result).toBe(false);
    });

    test('value < lte', () => {
      const valueCondition: ComparisonOperation = {
        lte: '1000000000000000000',
      };
      const value = BigNumber.from('900000000000000000');

      const result = allowCheckService.isAllowedValue(valueCondition, value);
      expect(result).toBe(true);
    });

    test('value == lte', () => {
      const valueCondition: ComparisonOperation = {
        lte: '1000000000000000000',
      };
      const value = BigNumber.from('1000000000000000000');

      const result = allowCheckService.isAllowedValue(valueCondition, value);
      expect(result).toBe(true);
    });

    test('value > lte', () => {
      const valueCondition: ComparisonOperation = {
        lte: '900000000000000000',
      };
      const value = BigNumber.from('1000000000000000000');

      const result = allowCheckService.isAllowedValue(valueCondition, value);
      expect(result).toBe(false);
    });

    test('valueCondition has invalid key', () => {
      const valueCondition = {
        leq: '900000000000000000',
      } as ComparisonOperation;
      const value = BigNumber.from('1000000000000000000');

      const result = allowCheckService.isAllowedValue(valueCondition, value);
      expect(result).toBe(false);
    });

    test('value is empty object', () => {
      const valueCondition = {};
      const value = BigNumber.from('1000000000000000000');

      const result = allowCheckService.isAllowedValue(valueCondition, value);
      expect(result).toBe(true);
    });

    test('value is not set', () => {
      const valueCondition = undefined;
      const value = BigNumber.from('1000000000000000000');

      const result = allowCheckService.isAllowedValue(valueCondition, value);
      expect(result).toBe(true);
    });
  });

  describe('webhookCheck', () => {
    test('status is 200', async () => {
      const status = 200;
      const webhookResponse = {
        status: status,
      };

      jest.spyOn(webhookService, 'post').mockResolvedValue(webhookResponse);
      const allowCheckService = new AllowCheckService(webhookService);

      const ip = '1.2.3.4';
      const headers = { host: 'localhost' };
      const body = {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getTransactionReceipt',
        params: [
          '0xc3a3a2feced276891d9658a62205ff049bab1e6e4e4d6ff500487e023fcb3d82',
        ],
      };

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

      const webhook = {
        url: 'https://localhost:8080',
        timeout: 1000,
        retry: 3,
        parse: false,
      };

      const result = await allowCheckService.webhookCheck(
        ip,
        headers,
        body,
        tx,
        webhook,
      );
      expect(result).toBe(true);
    });

    test('status is 500', async () => {
      const status = 500;
      const webhookResponse = {
        status: status,
      };

      jest.spyOn(webhookService, 'post').mockResolvedValue(webhookResponse);
      const allowCheckService = new AllowCheckService(webhookService);

      const ip = '1.2.3.4';
      const headers = { host: 'localhost' };
      const body = {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getTransactionReceipt',
        params: [
          '0xc3a3a2feced276891d9658a62205ff049bab1e6e4e4d6ff500487e023fcb3d82',
        ],
      };

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

      const webhook = {
        url: 'https://localhost:8080',
        timeout: 1000,
        retry: 3,
        parse: false,
      };

      const result = await allowCheckService.webhookCheck(
        ip,
        headers,
        body,
        tx,
        webhook,
      );
      expect(result).toBe(false);
    });
  });
});
