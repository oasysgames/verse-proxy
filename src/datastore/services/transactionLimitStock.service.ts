import { Injectable } from '@nestjs/common';
import { RateLimit } from 'src/config/transactionAllowList';
import { TransactionLimitStock } from 'src/datastore/entities';

@Injectable()
export class TransactionLimitStockService {
  private inventory: { [key: string]: TransactionLimitStock | undefined };
  private leastStockAmountRate: number;
  private leastTpsRate: number;

  constructor() {
    this.inventory = {};
    this.leastStockAmountRate = 0.2;
    this.leastTpsRate = 0.2;
  }

  isNeedTxLimitStockUpdate(
    txLimitStock: TransactionLimitStock | undefined,
    rateLimit: RateLimit,
  ) {
    return (
      txLimitStock === undefined ||
      (txLimitStock.stock <= 0 && !txLimitStock.isDatastoreLimit) ||
      Date.now() >= txLimitStock.createdAt + rateLimit.interval * 1000
    );
  }

  isSurplusStock(
    txLimitStock: TransactionLimitStock | undefined,
    rateLimit: RateLimit,
    idealStockAmount: number,
  ) {
    if (!txLimitStock) return false;
    const leastStockAmount = Math.floor(
      idealStockAmount * this.leastStockAmountRate,
    );
    if (leastStockAmount < 1) return false;

    const idealTps = rateLimit.limit / rateLimit.interval;
    const leastTps = idealTps * this.leastTpsRate;
    const elapsedSecondTime = (Date.now() - txLimitStock.createdAt) / 1000;
    const currentTps = (txLimitStock.counter + 1) / elapsedSecondTime;
    const currentStockAmount = txLimitStock.stock;

    // If the current TPS is less than 20% of the ideal TPS
    // and the current stock amount is more than 20% of the ideal stock amount
    const isSurplusStock =
      currentTps < leastTps && currentStockAmount > leastStockAmount;

    return isSurplusStock;
  }

  getSurplusStockAmount(
    txLimitStock: TransactionLimitStock,
    idealStockAmount: number,
  ) {
    const leastStockAmount = Math.floor(
      idealStockAmount * this.leastStockAmountRate,
    );
    if (leastStockAmount < 1) return 0;

    const currentStockAmount = txLimitStock.stock;

    if (currentStockAmount > leastStockAmount) {
      return currentStockAmount - leastStockAmount;
    }
    return 0;
  }

  reduceStock(key: string, amount: number) {
    const txLimitStock = this.getTxLimitStock(key);
    if (!txLimitStock) return;
    txLimitStock.stock -= amount;
    this.inventory[key] = txLimitStock;
  }

  consumeStock(key: string) {
    const txLimitStock = this.getTxLimitStock(key);
    if (!txLimitStock) return;
    txLimitStock.stock--;
    txLimitStock.counter++;
    this.inventory[key] = txLimitStock;
  }

  setTxLimitStock(key: string, txLimitStock: TransactionLimitStock) {
    this.inventory[key] = txLimitStock;
  }

  getTxLimitStock(key: string) {
    return this.inventory[key];
  }

  getTxLimitStockKey(
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
