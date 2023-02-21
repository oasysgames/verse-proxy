import { Test } from '@nestjs/testing';
import { BigNumber } from 'ethers';
import { HttpModule } from '@nestjs/axios';
import {
  ComparisonOperation,
  AddressRestriction,
} from 'src/config/transactionAllowList';
import { AllowCheckService, WebhookService } from 'src/services';

describe('AllowCheckService', () => {
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
  });

  describe('isAllowedAddress', () => {
    const allowCheckService = new AllowCheckService();

    test('allowList is set with wildcard', () => {
      const addressRestriction: AddressRestriction = { allowList: ['*'] };
      const input = '0xaf395754eB6F542742784cE7702940C60465A46a';

      const result = allowCheckService.isAllowedAddress(
        addressRestriction,
        input,
      );
      expect(result).toBe(true);
    });

    test('allowList is set with empty string', () => {
      const addressRestriction: AddressRestriction = { allowList: [''] };
      const input = '0xaf395754eB6F542742784cE7702940C60465A46a';

      const result = allowCheckService.isAllowedAddress(
        addressRestriction,
        input,
      );
      expect(result).toBe(false);
    });

    test('allowList has input', () => {
      const addressRestriction: AddressRestriction = {
        allowList: [
          '0xaf395754eB6F542742784cE7702940C60465A46a',
          '0xaf395754eB6F542742784cE7702940C60465A46b',
        ],
      };
      const input = '0xaf395754eB6F542742784cE7702940C60465A46a';

      const result = allowCheckService.isAllowedAddress(
        addressRestriction,
        input,
      );
      expect(result).toBe(true);
    });

    test('allowList does not have input', () => {
      const addressRestriction: AddressRestriction = {
        allowList: [
          '0xaf395754eB6F542742784cE7702940C60465A46a',
          '0xaf395754eB6F542742784cE7702940C60465A46b',
        ],
      };
      const input = '0xaf395754eB6F542742784cE7702940C60465A46c';

      const result = allowCheckService.isAllowedAddress(
        addressRestriction,
        input,
      );
      expect(result).toBe(false);
    });

    test('deniedList has input', () => {
      const addressRestriction: AddressRestriction = {
        deniedList: [
          '0xaf395754eB6F542742784cE7702940C60465A46a',
          '0xaf395754eB6F542742784cE7702940C60465A46b',
        ],
      };
      const input = '0xaf395754eB6F542742784cE7702940C60465A46a';

      const result = allowCheckService.isAllowedAddress(
        addressRestriction,
        input,
      );
      expect(result).toBe(false);
    });

    test('deniedList does not have input', () => {
      const addressRestriction: AddressRestriction = {
        deniedList: [
          '0xaf395754eB6F542742784cE7702940C60465A46a',
          '0xaf395754eB6F542742784cE7702940C60465A46b',
        ],
      };
      const input = '0xaf395754eB6F542742784cE7702940C60465A46c';

      const result = allowCheckService.isAllowedAddress(
        addressRestriction,
        input,
      );
      expect(result).toBe(true);
    });
  });

  describe('isAllowedContractMethod', () => {
    const allowCheckService = new AllowCheckService();

    test('contractMethodList is undefined', () => {
      const contractMethodList = undefined;
      const methodId = '0x095ea7b3'; // approve(address,uint256)

      const result = allowCheckService.isAllowedContractMethod(
        contractMethodList,
        methodId,
      );
      expect(result).toBe(true);
    });

    test('contractMethodList is empty array', () => {
      const contractMethodList: string[] = [];
      const methodId = '0x095ea7b3'; // approve(address,uint256)

      const result = allowCheckService.isAllowedContractMethod(
        contractMethodList,
        methodId,
      );
      expect(result).toBe(true);
    });

    test('allowedMethod is not in contractMethodList', () => {
      const contractMethodList = ['transfer(address,uint256)'];
      const methodId = '0x095ea7b3'; // approve(address,uint256)

      const result = allowCheckService.isAllowedContractMethod(
        contractMethodList,
        methodId,
      );
      expect(result).toBe(false);
    });

    test('allowedMethod is in contractMethodList', () => {
      const contractMethodList = [
        'approve(address,uint256)',
        'transfer(address,uint256)',
      ];
      const methodId = '0x095ea7b3'; // approve(address,uint256)

      const result = allowCheckService.isAllowedContractMethod(
        contractMethodList,
        methodId,
      );
      expect(result).toBe(true);
    });
  });

  describe('isAllowedValue', () => {
    const allowCheckService = new AllowCheckService();

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
});
