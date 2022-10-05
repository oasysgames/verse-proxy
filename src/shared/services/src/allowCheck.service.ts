import { Injectable } from '@nestjs/common';
import { TransactionAllow, ComparisonOperation } from 'src/shared/entities';

@Injectable()
export class AllowCheckService {
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

  isAllowedValue(valueCondition: ComparisonOperation, value: string): boolean {
    let isAllow = true;
    for (const key in valueCondition) {
      switch (key) {
        case 'eq':
          if (valueCondition.eq && value !== valueCondition.eq) isAllow = false;
          break;
        case 'nq':
          if (valueCondition.nq && value === valueCondition.nq) isAllow = false;
          break;
        case 'gt':
          if (valueCondition.gt && value <= valueCondition.gt) isAllow = false;
          break;
        case 'gte':
          if (valueCondition.gte && value < valueCondition.gte) isAllow = false;
          break;
        case 'lt':
          if (valueCondition.lt && value >= valueCondition.lt) isAllow = false;
          break;
        case 'lte':
          if (valueCondition.lte && value > valueCondition.lte) isAllow = false;
          break;
      }
    }
    return isAllow;
  }
}
