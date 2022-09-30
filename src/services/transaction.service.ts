import { Injectable, ForbiddenException } from '@nestjs/common';
import { ethers } from 'ethers';
import { TransactionAllowList } from 'src/shared/entities/src';
import { AllowCheckService } from 'src/shared/services/src';

@Injectable()
export class TransactionService {
  constructor(
    private allowCheckService: AllowCheckService,
    private txAllowList: TransactionAllowList,
  ) {}

  allowCheck(rawTx: string): void {
    const tx = this.parseRawTx(rawTx);
    const from = tx.from;
    const to = tx.to;
    const value = tx.value.toNumber();

    if (!from || !to) throw new ForbiddenException('transaction is invalid');

    let isAllow = false;
    for (const condition of this.txAllowList.list) {
      const fromCheck = condition.fromList.some((allowedFrom) => {
        return this.allowCheckService.isAllowedString(allowedFrom, from);
      });
      const toCheck = condition.toList.some((allowedTo) => {
        return this.allowCheckService.isAllowedString(allowedTo, to);
      });

      const valueCondition = condition.value;
      if (!valueCondition && fromCheck && toCheck) {
        isAllow = true;
        break;
      }

      if (!valueCondition) {
        if (fromCheck && toCheck) {
          isAllow = true;
          break;
        }
      } else {
        let valueCheck = true;
        for (const key in valueCondition) {
          switch (key) {
            case 'eq':
              if (valueCondition.eq && value !== valueCondition.eq)
                valueCheck = false;
              break;
            case 'neq':
              if (valueCondition.neq && value === valueCondition.neq)
                valueCheck = false;
              break;
            case 'gt':
              if (valueCondition.gt && value <= valueCondition.gt)
                valueCheck = false;
              break;
            case 'gte':
              if (valueCondition.gte && value < valueCondition.gte)
                valueCheck = false;
              break;
            case 'lt':
              if (valueCondition.lt && value >= valueCondition.lt)
                valueCheck = false;
              break;
            case 'lte':
              if (valueCondition.lte && value > valueCondition.lte)
                valueCheck = false;
              break;
          }
        }
        if (valueCheck && fromCheck && toCheck) {
          isAllow = true;
          break;
        }
      }
    }

    if (!isAllow) throw new ForbiddenException('transaction is not allowed');
    return;
  }

  parseRawTx(rawTx: string): ethers.Transaction {
    return ethers.utils.parseTransaction(rawTx);
  }
}
