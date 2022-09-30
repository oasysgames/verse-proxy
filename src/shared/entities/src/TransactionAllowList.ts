import { Injectable } from '@nestjs/common';

export interface TransactionAllow {
  fromList: Array<string>;
  toList: Array<string>;
}

@Injectable()
export class TransactionAllowList {
  public list: Array<TransactionAllow>;

  constructor() {
    this.list = [
      {
        fromList: ['*'],
        toList: ['*'],
      },
    ];
  }
}
