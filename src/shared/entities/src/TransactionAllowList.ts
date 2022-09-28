import { Injectable } from '@nestjs/common';

@Injectable()
export class TransactionAllowList {
  public fromList: Array<string>;
  public toList: Array<string>;

  constructor() {
    this.fromList = ['*'];
    this.toList = ['*'];
  }
}
