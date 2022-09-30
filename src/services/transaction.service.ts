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

    if (!from || !to) throw new ForbiddenException('transaction is invalid');

    let isAllow = false;
    for (const condition of this.txAllowList.list) {
      const fromCheck = condition.fromList.some((allowedFrom) => {
        return this.allowCheckService.isAllowedString(allowedFrom, from);
      });
      const toCheck = condition.toList.some((allowedTo) => {
        return this.allowCheckService.isAllowedString(allowedTo, to);
      });

      if (fromCheck && toCheck) {
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
