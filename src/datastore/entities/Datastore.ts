import { RateLimit } from 'src/config/transactionAllowList';

export interface Datastore {
  setHeartBeat(
    refreshMultiple: number,
    now: number,
    refreshTimestamp: number,
  ): Promise<void>;

  getWorkerCountInInterval(start: number, end: number): Promise<number>;

  returnSurplusTxLimitStock(
    key: string,
    rateLimit: RateLimit,
    getStandardTxLimitStockAmount: (limit: number) => Promise<number>,
  ): Promise<void>;

  resetTxLimitStock(
    key: string,
    rateLimit: RateLimit,
    getStandardTxLimitStockAmount: (limit: number) => Promise<number>,
  ): Promise<void>;

  getBlockNumber(key: string): Promise<{
    blockNumber: string;
    updatedAt: number;
  } | null>;

  setBlockNumber(key: string, blockNumber: string): Promise<void>;
}
