import { BigNumber } from 'ethers';
import {
  TransactionAllow,
  ComparisonOperation,
} from 'src/config/transactionAllowList';
import { AllowCheckService } from 'src/services';
import * as transactionAllowList from 'src/config/transactionAllowList';

describe('isAllowedString', () => {
  const allowCheckService = new AllowCheckService();

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
    const input = '0xaf395754eB6F542742784cE7702940C60465A46c';

    const result = allowCheckService.isAllowedString(allowPattern, input);
    expect(result).toBe(true);
  });
});

describe('isAllowedFrom', () => {
  const allowCheckService = new AllowCheckService();

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
  const allowCheckService = new AllowCheckService();

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

    const allowCheckService = new AllowCheckService();

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
    ]);

    const allowCheckService = new AllowCheckService();

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
      '0xaf395754eB6F542742784cE7702940C60465A46a',
    ]);

    const allowCheckService = new AllowCheckService();

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

    const allowCheckService = new AllowCheckService();

    const from = '0xaf395754eB6F542742784cE7702940C60465A46c';
    const result = allowCheckService.isAllowedDeploy(from);
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
