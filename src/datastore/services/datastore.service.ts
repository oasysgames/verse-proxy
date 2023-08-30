import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RateLimit } from 'src/config/transactionAllowList';
import { RequestContext, BlockNumberData } from 'src/datastore/entities';
import { RdbService } from './rdb.service';
import { RedisService } from './redis.service';
import {
  HeartbeatMillisecondInterval,
  workerCountMillisecondInterval,
} from 'src/constants';
import { CacheService } from './cache.service';
import { TransactionLimitStockService } from './transactionLimitStock.service';
import { blockNumberCacheExpireSecLimit } from 'src/datastore/consts';
import { Datastore } from 'src/datastore/entities';

@Injectable()
export class DatastoreService {
  private datastore: Datastore;
  private blockNumberCacheExpireSec: number;
  private intervalTimesToCheckWorkerCount: number;

  constructor(
    private configService: ConfigService,
    redisService: RedisService,
    rdbService: RdbService,
    private cacheService: CacheService,
    private txLimitStockService: TransactionLimitStockService,
  ) {
    const blockNumberCacheExpireSec =
      this.configService.get<number>('blockNumberCacheExpireSec') || 0;
    this.intervalTimesToCheckWorkerCount = 3;
    const redisUri = process.env.REDIS_URI;
    const rdbUri = process.env.RDB_URI;

    if (redisUri) {
      this.datastore = redisService;
    } else if (rdbUri) {
      this.datastore = rdbService;
    }

    if (blockNumberCacheExpireSec > blockNumberCacheExpireSecLimit) {
      console.warn(
        `block_number_cache_expire limit is ${blockNumberCacheExpireSecLimit}. block_number_cache_expire is set to ${blockNumberCacheExpireSecLimit}`,
      );
      this.blockNumberCacheExpireSec = blockNumberCacheExpireSecLimit;
    } else {
      this.blockNumberCacheExpireSec = blockNumberCacheExpireSec;
    }
  }

  async getWorkerCount() {
    try {
      const workerCount = await this.cacheService.getWorkerCount();
      if (workerCount) return workerCount;

      return await this.setWorkerCount();
    } catch (err) {
      if (err instanceof Error) {
        console.error(err.message);
      } else {
        console.error(err);
      }
      return 0;
    }
  }

  async getAllowedTxCount(
    from: string,
    to: string,
    methodId: string,
    rateLimit: RateLimit,
  ) {
    let count = 0;

    try {
      const key = this.txLimitStockService.getTxLimitStockKey(
        from,
        to,
        methodId,
        rateLimit,
      );
      let txLimitStock = this.txLimitStockService.getTxLimitStock(key);
      const getStandardTxLimitStockAmount = async (limit: number) => {
        return await this.getStandardTxLimitStockAmount(limit);
      };
      if (
        this.txLimitStockService.isNeedTxLimitStockUpdate(
          txLimitStock,
          rateLimit,
        )
      ) {
        await this.datastore.resetTxLimitStock(
          key,
          rateLimit,
          getStandardTxLimitStockAmount,
        );
      } else if (
        this.txLimitStockService.isSurplusStock(
          txLimitStock,
          rateLimit,
          await this.getStandardTxLimitStockAmount(rateLimit.limit),
        )
      ) {
        await this.datastore.returnSurplusTxLimitStock(
          key,
          rateLimit,
          getStandardTxLimitStockAmount,
        );
      }
      this.txLimitStockService.consumeStock(key);
      txLimitStock = this.txLimitStockService.getTxLimitStock(key);
      count = txLimitStock ? txLimitStock.stock : 0;
      return count;
    } catch (err) {
      if (err instanceof Error) {
        console.error(err.message);
      } else {
        console.error(err);
      }
      return 0;
    }
  }

  async getBlockNumber(requestContext: RequestContext) {
    let blockNumber = '';
    let blockNumberData: BlockNumberData | null = null;
    const key = this.cacheService.getBlockNumberCacheKey(requestContext);
    const cache = await this.cacheService.getBlockNumber(key);
    if (cache) return cache;

    try {
      blockNumberData = await this.datastore.getBlockNumber(key);
      if (
        !blockNumberData ||
        Date.now() >=
          blockNumberData.updatedAt + this.blockNumberCacheExpireSec * 1000
      ) {
        blockNumber = '';
      } else {
        blockNumber = blockNumberData.blockNumber;
      }
      if (blockNumber)
        await this.cacheService.setBlockNumber(
          key,
          blockNumber,
          this.blockNumberCacheExpireSec * 1000,
        );
      return blockNumber;
    } catch (err) {
      if (err instanceof Error) {
        console.error(err.message);
      } else {
        console.error(err);
      }
      return '';
    }
  }

  // Calculate the standard stock amount of transaction count inventory
  // based on the number of workers in the standing proxy
  async getStandardTxLimitStockAmount(limit: number) {
    const workerCount = await this.getWorkerCount();
    const txCountStockStandardAmount = Math.floor(limit / (5 * workerCount));
    if (txCountStockStandardAmount < 1) return 1;
    return txCountStockStandardAmount;
  }

  async setBlockNumber(requestContext: RequestContext, blockNumber: string) {
    try {
      const key = this.cacheService.getBlockNumberCacheKey(requestContext);
      await this.datastore.setBlockNumber(key, blockNumber);
      await this.cacheService.setBlockNumber(
        key,
        blockNumber,
        this.blockNumberCacheExpireSec * 1000,
      );
    } catch (err) {
      if (err instanceof Error) {
        console.error(err.message);
      } else {
        console.error(err);
      }
      return;
    }
  }

  async setHeartBeat() {
    try {
      const refreshMultiple = 10;
      const now = Date.now();
      const refreshTimestamp =
        now -
        this.intervalTimesToCheckWorkerCount * HeartbeatMillisecondInterval;
      await this.datastore.setHeartBeat(refreshMultiple, now, refreshTimestamp);
    } catch (err) {
      if (err instanceof Error) {
        console.error(err.message);
      } else {
        console.error(err);
      }
      return 0;
    }
  }

  // Counts the number of heartbeats during `intervalTimesToCheckWorkerCount` Heartbeat cronjob runs
  // and calculates the average number of heartbeats in one interval
  async setWorkerCount() {
    let workerCountAverage = 0;
    try {
      const now = Date.now();
      const intervalAgo =
        now -
        this.intervalTimesToCheckWorkerCount * HeartbeatMillisecondInterval;
      workerCountAverage = Math.floor(
        (await this.datastore.getWorkerCountInInterval(intervalAgo, now)) /
          this.intervalTimesToCheckWorkerCount,
      );
      const workerCount = Math.max(workerCountAverage, 1);
      await this.cacheService.setWorkerCount(
        workerCount,
        workerCountMillisecondInterval,
      );
      return workerCount;
    } catch (err) {
      if (err instanceof Error) {
        console.error(err.message);
      } else {
        console.error(err);
      }
      return 0;
    }
  }
}
