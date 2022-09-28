import { Injectable } from '@nestjs/common';

export interface TransactionAllow {
  from: string;
  to: string;
}

@Injectable()
export class TransactionAllowList {
  public list: Array<TransactionAllow>;

  constructor() {
    this.list = [
      {
        from: '*',
        to: '*',
      },
    ];
  }
}
