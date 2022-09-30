import { Injectable, ForbiddenException } from '@nestjs/common';
import { ethers } from 'ethers';
import { TransactionAllow } from 'src/shared/entities';
import { AllowCheckService } from 'src/shared/services/src';
import getTxAllowList from 'src/config/transactionAllowList';

@Injectable()
export class TransactionService {
  private txAllowList: Array<TransactionAllow>;
  constructor(private allowCheckService: AllowCheckService) {
    this.txAllowList = getTxAllowList();
  }

  allowCheck(rawTx: string): void {
    const tx = this.parseRawTx(rawTx);
    const from = tx.from;
    const to = tx.to;
    const value = tx.value.toNumber();

    if (!from || !to) throw new ForbiddenException('transaction is invalid');

    let isAllow = false;
    for (const condition of this.txAllowList) {
      const fromCheck = this.allowCheckService.isAllowedFrom(condition, from);
      const toCheck = this.allowCheckService.isAllowedTo(condition, to);

      const valueCondition = condition.value;
      const valueCheck = valueCondition
        ? this.allowCheckService.isAllowedValue(valueCondition, value)
        : true;

      if (fromCheck && toCheck && valueCheck) {
        isAllow = true;
        break;
      }
    }

    if (!isAllow) throw new ForbiddenException('transaction is not allowed');
    return;
  }

  parseRawTx(rawTx: string): ethers.Transaction {
    return ethers.utils.parseTransaction(rawTx);
  }
}
