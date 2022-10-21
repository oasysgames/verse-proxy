import { Injectable } from '@nestjs/common';
import { TransactionAllow, ComparisonOperation } from 'src/shared/entities';
import { BigNumber } from 'ethers';
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
      return allowedFrom.toLowerCase() === from.toLowerCase();
    });
    return isAllow;
  }

  isAllowedValue(
    valueCondition: ComparisonOperation,
    value: BigNumber,
  ): boolean {
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
      }
    }
    return isAllow;
  }
}
