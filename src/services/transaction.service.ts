import { Injectable } from '@nestjs/common';

@Injectable()
export class TransactionService {
  isAllowedTransaction(rawTx: string): boolean {
    return true;
  }

  parseRawTx(rawTx: string): boolean {
    return true;
  }
}
