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
    const fromCheck = this.txAllowList.fromList.some((condition) => {
      return this.allowCheckService.isAllowedString(condition, from);
    });
    const toCheck = this.txAllowList.toList.some((condition) => {
      return this.allowCheckService.isAllowedString(condition, to);
    });

    if (!fromCheck)
      throw new ForbiddenException('transaction_from_parameter is invalid');
    if (!toCheck)
      throw new ForbiddenException('transaction_to_parameter is invalid');
    return;
  }

  parseRawTx(rawTx: string): ethers.Transaction {
    return ethers.utils.parseTransaction(rawTx);
  }
}
