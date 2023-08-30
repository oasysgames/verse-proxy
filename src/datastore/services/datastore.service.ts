import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RateLimit } from 'src/config/transactionAllowList';
import { RequestContext } from 'src/datastore/entities';
import { RdbService } from './rdb.service';
import { RedisService } from './redis.service';
import {
  HeartbeatMillisecondInterval,
  workerCountMillisecondInterval,
} from 'src/constants';
import { CacheService } from './cache.service';
import { TransactionLimitStockService } from './transactionLimitStock.service';
import { blockNumberCacheExpireSecLimit } from 'src/datastore/consts';

@Injectable()
export class DatastoreService {
  private datastore: string;
  private blockNumberCacheExpireSec: number;
  private intervalTimesToCheckWorkerCount: number;

  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
    private rdbService: RdbService,
    private cacheService: CacheService,
    private txLimitStockService: TransactionLimitStockService,
  ) {
    const blockNumberCacheExpireSec =
      this.configService.get<number>('blockNumberCacheExpireSec') || 0;
    this.intervalTimesToCheckWorkerCount = 3;
    const redisUri = process.env.REDIS_URI;
    const rdbUri = process.env.RDB_URI;

    if (redisUri) {
      this.datastore = 'redis';
    } else if (rdbUri) {
      this.datastore = 'rdb';
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
      switch (this.datastore) {
        case 'redis':
          if (
            this.txLimitStockService.isNeedTxLimitStockUpdate(
              txLimitStock,
              rateLimit,
            )
          ) {
            await this.redisService.resetTxLimitStock(
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
            await this.redisService.returnSurplusTxLimitStock(
              key,
              rateLimit,
              getStandardTxLimitStockAmount,
            );
          }
          break;
        case 'rdb':
          if (
            this.txLimitStockService.isNeedTxLimitStockUpdate(
              txLimitStock,
              rateLimit,
            )
          ) {
            await this.rdbService.resetTxLimitStock(
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
            await this.rdbService.returnSurplusTxLimitStock(
              key,
              rateLimit,
              getStandardTxLimitStockAmount,
            );
          }
          break;
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
    const key = this.cacheService.getBlockNumberCacheKey(requestContext);
    const cache = await this.cacheService.getBlockNumber(key);
    if (cache) return cache;

    try {
      switch (this.datastore) {
        case 'redis':
          blockNumber = (await this.redisService.getBlockNumber(key)) ?? '';
          break;
        case 'rdb':
          const blockNumberData = await this.rdbService.getBlockNumber(key);
          if (
            !blockNumberData ||
            Date.now() >=
              blockNumberData.updated_at + this.blockNumberCacheExpireSec * 1000
          ) {
            blockNumber = '';
            break;
          }
          blockNumber = blockNumberData.value;
          break;
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
      switch (this.datastore) {
        case 'redis':
          await this.redisService.setBlockNumber(
            key,
            blockNumber,
            this.blockNumberCacheExpireSec,
          );
          break;
        case 'rdb':
          await this.rdbService.setBlockNumber(key, blockNumber);
          break;
      }
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
      switch (this.datastore) {
        case 'redis':
          await this.redisService.setHeartBeat(
            refreshMultiple,
            now,
            refreshTimestamp,
          );
          break;
        case 'rdb':
          await this.rdbService.setHeartBeat(
            refreshMultiple,
            now,
            refreshTimestamp,
          );
          break;
      }
    } catch (err) {
      if (err instanceof Error) {
        console.error(err.message);
      } else {
        console.error(err);
      }
      return 0;
    }
  }

  async setWorkerCount() {
    let workerCountAverage = 0;
    try {
      const now = Date.now();
      const intervalAgo =
        now -
        this.intervalTimesToCheckWorkerCount * HeartbeatMillisecondInterval;
      // counts the number of heartbeats during `intervalTimesToCheckWorkerCount` Heartbeat cronjob runs and calculates the average number of heartbeats in one interval
      switch (this.datastore) {
        case 'redis':
          workerCountAverage = Math.floor(
            (await this.redisService.getWorkerCountInInterval(
              intervalAgo,
              now,
            )) / this.intervalTimesToCheckWorkerCount,
          );
          break;
        case 'rdb':
          workerCountAverage = Math.floor(
            (await this.rdbService.getWorkerCountInInterval(intervalAgo, now)) /
              this.intervalTimesToCheckWorkerCount,
          );
          break;
      }
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
