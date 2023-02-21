import { Injectable } from '@nestjs/common';
import { BigNumber, utils } from 'ethers';
import {
  ComparisonOperation,
  AddressRestriction,
} from 'src/config/transactionAllowList';

@Injectable()
export class AllowCheckService {
  isAllowedAddress(addressRestriction: AddressRestriction, input: string) {
    let isAllowedAddress = false;
    if (addressRestriction.allowList) {
      isAllowedAddress = addressRestriction.allowList.some((allowedAddress) => {
        if (allowedAddress === '*') return true;
        if (allowedAddress === '') return false;
        return allowedAddress.toLowerCase() === input.toLowerCase();
      });
    } else if (addressRestriction.deniedList) {
      isAllowedAddress = addressRestriction.deniedList.every(
        (deniedAddress) => {
          return deniedAddress.toLowerCase() !== input.toLowerCase();
        },
      );
    }
    return isAllowedAddress;
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
}
