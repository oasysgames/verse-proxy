import { BigNumber } from 'ethers';
import { ComparisonOperation } from 'src/config/transactionAllowList';
import { AllowCheckService } from 'src/services';

describe('checkAddressList', () => {
  const allowCheckService = new AllowCheckService();

  test('addressList includes only wildcard', () => {
    const addressList = ['*'];

    expect(() => allowCheckService.checkAddressList(addressList)).not.toThrow();
  });

  test('addressList includes wildcard and another address', () => {
    const addressList = ['*', '0xaf395754eB6F542742784cE7702940C60465A46a'];

    expect(() => allowCheckService.checkAddressList(addressList)).toThrow(
      'You can not set wildcard with another address',
    );
  });

  test('addressList includes only normal_address', () => {
    const addressList = [
      '0xaf395754eB6F542742784cE7702940C60465A46c',
      '0xaf395754eB6F542742784cE7702940C60465A46a',
    ];

    expect(() => allowCheckService.checkAddressList(addressList)).not.toThrow();
  });

  test('addressList includes only exception_pattern', () => {
    const addressList = [
      '!0xaf395754eB6F542742784cE7702940C60465A46c',
      '!0xaf395754eB6F542742784cE7702940C60465A46a',
    ];

    expect(() => allowCheckService.checkAddressList(addressList)).not.toThrow();
  });

  test('addressList includes normal_address and exception_pattern', () => {
    const addressList = [
      '!0xaf395754eB6F542742784cE7702940C60465A46c',
      '0xaf395754eB6F542742784cE7702940C60465A46a',
    ];

    expect(() => allowCheckService.checkAddressList(addressList)).toThrow(
      'You can not set setting with address and address_denial(!address)',
    );
  });

  test('addressList includes normal_address and exception_pattern', () => {
    const addressList = [
      '0xaf395754eB6F542742784cE7702940C60465A46a',
      '!0xaf395754eB6F542742784cE7702940C60465A46c',
    ];

    expect(() => allowCheckService.checkAddressList(addressList)).toThrow(
      'You can not set setting with address and address_denial(!address)',
    );
  });
});

describe('isIncludedAddress', () => {
  const allowCheckService = new AllowCheckService();

  describe('addressList and input have the same font case', () => {
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

  describe('addressList and input do not have the same font case', () => {
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
      const input = '0xaf395754eB6F542742784cE7702940C60465A46a'.toUpperCase();

      const result = allowCheckService.isIncludedAddress(addressList, input);
      expect(result).toBe(true);
    });

    test('addressList does not include to', () => {
      const addressList = [
        '0xaf395754eB6F542742784cE7702940C60465A46c',
        '0xaf395754eB6F542742784cE7702940C60465A46d',
      ];
      const input = '0xaf395754eB6F542742784cE7702940C60465A46a'.toUpperCase();

      const result = allowCheckService.isIncludedAddress(addressList, input);
      expect(result).toBe(false);
    });

    test('addressList has exception_pattern and input is exception_pattern', () => {
      const addressList = [
        '!0xaf395754eB6F542742784cE7702940C60465A46c',
        '!0xaf395754eB6F542742784cE7702940C60465A46a',
      ];
      const input = '0xaf395754eB6F542742784cE7702940C60465A46a'.toUpperCase();

      const result = allowCheckService.isIncludedAddress(addressList, input);
      expect(result).toBe(false);
    });

    test('addressList has exception_pattern and input is not exception_pattern', () => {
      const addressList = [
        '!0xaf395754eB6F542742784cE7702940C60465A46c',
        '!0xaf395754eB6F542742784cE7702940C60465A46a',
      ];
      const input = '0xaf395754eB6F542742784cE7702940C60465A46d'.toUpperCase();

      const result = allowCheckService.isIncludedAddress(addressList, input);
      expect(result).toBe(true);
    });
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
