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

    const isAllow = this.txAllowList.list.some((condition) => {
      const fromCheck = this.allowCheckService.isAllowedString(
        condition.from,
        from,
      );
      const toCheck = this.allowCheckService.isAllowedString(condition.to, to);

      return fromCheck && toCheck;
    });

    if (!isAllow) throw new ForbiddenException('transaction is not allowed');
    return;
  }

  parseRawTx(rawTx: string): ethers.Transaction {
    return ethers.utils.parseTransaction(rawTx);
  }
}
