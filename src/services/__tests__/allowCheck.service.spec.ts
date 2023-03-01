import { BigNumber } from 'ethers';
import { ComparisonOperation } from 'src/config/transactionAllowList';
import { AllowCheckService } from 'src/services';
import * as transactionAllowList from 'src/config/transactionAllowList';

describe('isIncludedAddress', () => {
  const allowCheckService = new AllowCheckService();

  test('addressList is wildcard', () => {
    const addressList = ['*'];
    const input = '0xaf395754eB6F542742784cE7702940C60465A46a';

    const result = allowCheckService.isIncludedAddress(addressList, input);
    expect(result).toBe(true);
  });

  test('addressList includes to', () => {
    const addressList = [
      '0xaf395754eB6F542742784cE7702940C60465A46c',
      '0xaf395754eB6F542742784cE7702940C60465A46a',
    ];
    const input = '0xaf395754eB6F542742784cE7702940C60465A46a';

    const result = allowCheckService.isIncludedAddress(addressList, input);
    expect(result).toBe(true);
  });

  test('addressList does not include to', () => {
    const addressList = [
      '0xaf395754eB6F542742784cE7702940C60465A46c',
      '0xaf395754eB6F542742784cE7702940C60465A46d',
    ];
    const input = '0xaf395754eB6F542742784cE7702940C60465A46a';

    const result = allowCheckService.isIncludedAddress(addressList, input);
    expect(result).toBe(false);
  });

  test('addressList has exception_pattern and input is exception_pattern', () => {
    const addressList = [
      '!0xaf395754eB6F542742784cE7702940C60465A46c',
      '!0xaf395754eB6F542742784cE7702940C60465A46a',
    ];
    const input = '0xaf395754eB6F542742784cE7702940C60465A46a';

    const result = allowCheckService.isIncludedAddress(addressList, input);
    expect(result).toBe(false);
  });

  test('addressList has exception_pattern and input is not exception_pattern', () => {
    const addressList = [
      '!0xaf395754eB6F542742784cE7702940C60465A46c',
      '!0xaf395754eB6F542742784cE7702940C60465A46a',
    ];
    const input = '0xaf395754eB6F542742784cE7702940C60465A46d';

    const result = allowCheckService.isIncludedAddress(addressList, input);
    expect(result).toBe(true);
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
      '!0xaf395754eB6F542742784cE7702940C60465A46d',
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

describe('isUnlimitedTxRate', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('from is not included in unlimitedTxRateAddresses', () => {
    const getUnlimitedTxRateAddressesMock = jest.spyOn(
      transactionAllowList,
      'getUnlimitedTxRateAddresses',
    );
    getUnlimitedTxRateAddressesMock.mockReturnValue([
      '0xaf395754eB6F542742784cE7702940C60465A46a',
      '0xaf395754eB6F542742784cE7702940C60465A46d',
    ]);

    const allowCheckService = new AllowCheckService();

    const from = '0xaf395754eB6F542742784cE7702940C60465A46c';
    const result = allowCheckService.isUnlimitedTxRate(from);
    expect(result).toBe(false);
  });

  test('from is not allowed in unlimitedTxRateAddresses', () => {
    const getUnlimitedTxRateAddressesMock = jest.spyOn(
      transactionAllowList,
      'getUnlimitedTxRateAddresses',
    );
    getUnlimitedTxRateAddressesMock.mockReturnValue([
      '!0xaf395754eB6F542742784cE7702940C60465A46c',
      '!0xaf395754eB6F542742784cE7702940C60465A46d',
    ]);

    const allowCheckService = new AllowCheckService();

    const from = '0xaf395754eB6F542742784cE7702940C60465A46c';
    const result = allowCheckService.isUnlimitedTxRate(from);
    expect(result).toBe(false);
  });

  test('from is allowed in unlimitedTxRateAddresses', () => {
    const getUnlimitedTxRateAddressesMock = jest.spyOn(
      transactionAllowList,
      'getUnlimitedTxRateAddresses',
    );
    getUnlimitedTxRateAddressesMock.mockReturnValue([
      '0xaf395754eB6F542742784cE7702940C60465A46a',
    ]);

    const allowCheckService = new AllowCheckService();

    const from = '0xaf395754eB6F542742784cE7702940C60465A46a';
    const result = allowCheckService.isUnlimitedTxRate(from);
    expect(result).toBe(true);
  });

  test('unlimitedTxRateAddresses has wildcard', () => {
    const getUnlimitedTxRateAddressesMock = jest.spyOn(
      transactionAllowList,
      'getUnlimitedTxRateAddresses',
    );
    getUnlimitedTxRateAddressesMock.mockReturnValue(['*']);

    const allowCheckService = new AllowCheckService();

    const from = '0xaf395754eB6F542742784cE7702940C60465A46c';
    const result = allowCheckService.isUnlimitedTxRate(from);
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
