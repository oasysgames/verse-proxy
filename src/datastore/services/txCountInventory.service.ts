import { Injectable } from '@nestjs/common';
import { RateLimit } from 'src/config/transactionAllowList';
import { TransactionCountInventory } from 'src/datastore/entities';

@Injectable()
export class TxCountInventoryService {
  private inventory: { [key: string]: TransactionCountInventory | undefined };
  private processCount: number;

  constructor() {
    this.inventory = {};
    this.processCount = process.env.CLUSTER_PROCESS
      ? parseInt(process.env.CLUSTER_PROCESS, 10)
      : 1;
  }

  isNeedTxCountUpdate(
    txCountInventory: TransactionCountInventory | undefined,
    rateLimit: RateLimit,
  ) {
    return (
      txCountInventory === undefined ||
      (txCountInventory.value <= 0 && !txCountInventory.isDatastoreLimit) ||
      Date.now() >=
        txCountInventory.createdAt.getTime() + rateLimit.interval * 1000
    );
  }

  reduceAllowedTxCount(key: string) {
    const txCount = this.getAllowedTxCount(key);
    if (!txCount) return;
    txCount.value--;
    this.inventory[key] = txCount;
  }

  setTxCount(key: string, newTxCount: TransactionCountInventory) {
    this.inventory[key] = newTxCount;
  }

  getAllowedTxCount(key: string) {
    return this.inventory[key];
  }

  getTxCountStock(limit: number): number {
    const stockCount1 = Math.floor(limit / (10 * this.processCount));
    const stockCount2 = Math.floor(limit / (3 * this.processCount));

    if (stockCount1 >= 1) {
      return stockCount1;
    } else if (stockCount2 >= 1) {
      return stockCount2;
    }
    return 1;
  }

  getAllowedTxCountCacheKey(
    from: string,
    to: string,
    methodId: string,
    rateLimit: RateLimit,
  ) {
    const { name, perFrom, perTo, perMethod } = rateLimit;

    const keyArray = [];
    keyArray.push(name);
    keyArray.push(perFrom ? `${from}` : '*');
    keyArray.push(perTo ? `${to}` : '*');
    keyArray.push(perMethod ? `${methodId}` : '*');
    const key = keyArray.join(':');

    return key;
  }
}
