import { Injectable } from '@nestjs/common';
import { BigNumber, utils } from 'ethers';
import {
  TransactionAllow,
  ComparisonOperation,
  ContractList,
} from 'src/config/transactionAllowList';
import { getDeployAllowList } from 'src/config/transactionAllowList';

@Injectable()
export class AllowCheckService {
  private deployAllowList: Array<string>;
  constructor() {
    this.deployAllowList = getDeployAllowList();
  }

  isAllowedString(allowPattern: string, input: string): boolean {
    if (allowPattern[0] === '!' && allowPattern.slice(1) === input)
      return false;
    if (allowPattern === '*' || allowPattern === input) return true;
    return false;
  }

  isAllowedFrom(condition: TransactionAllow, from: string): boolean {
    const isAllow = condition.fromList.some((allowedFrom) => {
      return this.isAllowedString(
        allowedFrom.toLowerCase(),
        from.toLowerCase(),
      );
    });
    return isAllow;
  }

  isAllowedTo(condition: TransactionAllow, to: string): boolean {
    const isAllow = condition.toList.some((allowedTo) => {
      return this.isAllowedString(allowedTo.toLowerCase(), to.toLowerCase());
    });
    return isAllow;
  }

  isAllowedDeploy(from: string): boolean {
    const isAllow = this.deployAllowList.some((allowedFrom) => {
      return this.isAllowedString(
        allowedFrom.toLowerCase(),
        from.toLowerCase(),
      );
    });
    return isAllow;
  }

  isAllowedContractMethod(
    contractList: ContractList | undefined,
    to: string,
    methodId: string,
  ): boolean {
    if (contractList === undefined) return true;
    if (Object.keys(contractList).length === 0) return true;

    const allowedContract = contractList[to];
    if (!allowedContract) return false;

    const isAllowMethod = allowedContract.some((allowedMethod) => {
      const allowedMethodId = utils.id(allowedMethod).substring(0, 10);
      return allowedMethodId === methodId;
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
