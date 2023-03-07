import { Injectable } from '@nestjs/common';
import { ComparisonOperation } from 'src/config/transactionAllowList';
import { BigNumber, utils } from 'ethers';
import {
  getDeployAllowList,
  getUnlimitedTxRateAddresses,
} from 'src/config/transactionAllowList';

@Injectable()
export class AllowCheckService {
  private deployAllowList: Array<string>;
  private unlimitedTxRateAddresses: Array<string>;
  constructor() {
    this.deployAllowList = getDeployAllowList();
    this.unlimitedTxRateAddresses = getUnlimitedTxRateAddresses();
    this.checkAddressList(this.deployAllowList);
    this.checkAddressList(this.unlimitedTxRateAddresses);
  }

  checkAddressList(addressList: Array<string>) {
    if (addressList.includes('*')) {
      if (addressList.length !== 1)
        throw new Error('You can not set wildcard with another address');
      return;
    }

    let isAllow: boolean;
    const firstAddress = addressList[0];

    if (firstAddress[0] === '!') {
      isAllow = addressList.every((address) => {
        return address[0] === '!';
      });
    } else {
      isAllow = addressList.every((address) => {
        return address[0] !== '!';
      });
    }

    if (!isAllow)
      throw new Error(
        'You can not set setting with address and address_denial(!address)',
      );
  }

  isIncludedAddress(addressList: Array<string>, input: string) {
    if (addressList.includes('*')) return true;

    let isAllow: boolean;
    const firstAddress = addressList[0];

    if (firstAddress[0] === '!') {
      isAllow = this.isNotProhibitedAddress(addressList, input);
    } else {
      isAllow = this.isAllowedAddress(addressList, input);
    }

    return isAllow;
  }

  isAllowedDeploy(from: string): boolean {
    const isAllow = this.isIncludedAddress(this.deployAllowList, from);
    return isAllow;
  }

  isUnlimitedTxRate(from: string): boolean {
    const isAllow = this.isIncludedAddress(this.unlimitedTxRateAddresses, from);
    return isAllow;
  }

  isAllowedContractMethod(
    contractMethodList: string[] | undefined,
    methodId: string,
  ): boolean {
    if (contractMethodList === undefined) return true;
    if (contractMethodList.length === 0) return true;

    const isAllowMethod = contractMethodList.some((allowedMethod) => {
      const allowedMethodId = utils.id(allowedMethod).substring(0, 10);
      return allowedMethodId.toLowerCase() === methodId.toLowerCase();
    });

    return isAllowMethod;
  }

  isAllowedValue(
    valueCondition: ComparisonOperation | undefined,
    value: BigNumber,
  ): boolean {
    if (valueCondition === undefined) return true;
    if (Object.keys(valueCondition).length === 0) return true;

    let isAllow = true;
    for (const key in valueCondition) {
      switch (key) {
        case 'eq':
          if (valueCondition.eq && !value.eq(valueCondition.eq))
            isAllow = false;
          break;
        case 'nq':
          if (valueCondition.nq && value.eq(valueCondition.nq)) isAllow = false;
          break;
        case 'gt':
          if (valueCondition.gt && value.lte(valueCondition.gt))
            isAllow = false;
          break;
        case 'gte':
          if (valueCondition.gte && value.lt(valueCondition.gte))
            isAllow = false;
          break;
        case 'lt':
          if (valueCondition.lt && value.gte(valueCondition.lt))
            isAllow = false;
          break;
        case 'lte':
          if (valueCondition.lte && value.gt(valueCondition.lte))
            isAllow = false;
          break;
        default: // key is not invalid(e.g. leq)
          isAllow = false;
          break;
      }
    }
    return isAllow;
  }

  private isNotProhibitedAddress(addressList: Array<string>, input: string) {
    const isAllow = addressList.every((allowPattern) => {
      return allowPattern.slice(1).toLowerCase() !== input.toLowerCase();
    });

    return isAllow;
  }

  private isAllowedAddress(addressList: Array<string>, input: string) {
    const isAllow = addressList.some((allowPattern) => {
      return allowPattern.toLowerCase() === input.toLowerCase();
    });

    return isAllow;
  }
}
