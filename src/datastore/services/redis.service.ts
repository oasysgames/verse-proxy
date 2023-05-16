import { Injectable, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { RateLimit } from 'src/config/transactionAllowList';
import { CacheService } from './cache.service';
import {
  HeartbeatMillisecondInterval,
  workerCountMillisecondInterval,
} from 'src/constants';
import { RequestContext } from 'src/datastore/entities';
import { blockNumberCacheExpireSecLimit } from 'src/datastore/consts';
import { TransactionLimitStockService } from './transactionLimitStock.service';

@Injectable()
export class RedisService {
  private blockNumberCacheExpireSec: number;
  private intervalTimesToCheckWorkerCount: number;
  private heartBeatKey = 'heartbeat';
  private txCountFieldNames = {
    count: 'count',
    createdAt: 'created_at',
  };

  constructor(
    private configService: ConfigService,
    private cacheService: CacheService,
    private txLimitStockService: TransactionLimitStockService,
    @Inject('REDIS') @Optional() private redis: Redis,
  ) {
    this.intervalTimesToCheckWorkerCount = 3;
    const blockNumberCacheExpireSec =
      this.configService.get<number>('blockNumberCacheExpireSec') || 0;

    if (blockNumberCacheExpireSec > blockNumberCacheExpireSecLimit) {
      console.warn(
        `block_number_cache_expire limit is ${blockNumberCacheExpireSecLimit}. block_number_cache_expire is set to ${blockNumberCacheExpireSecLimit}`,
      );
      this.blockNumberCacheExpireSec = blockNumberCacheExpireSecLimit;
    } else {
      this.blockNumberCacheExpireSec = blockNumberCacheExpireSec;
    }
  }

  async setHeartBeat() {
    const now = Date.now();
    const pipeline = this.redis.pipeline();
    pipeline.zadd(this.heartBeatKey, now, now);
    if (now % 10 === 0) {
      pipeline.zremrangebyscore(
        this.heartBeatKey,
        0,
        now -
          this.intervalTimesToCheckWorkerCount * HeartbeatMillisecondInterval,
      );
    }
    await pipeline.exec();
  }

  // `setHeartBeat` is executed at regular intervals by a cronjob.
  // The number of workers is the number of heartbeats counted
  // from the time before the interval when `setHeartBeat` is executed to the current time.
  async setWorkerCountToCache() {
    const now = Date.now();
    const intervalAgo =
      now - this.intervalTimesToCheckWorkerCount * HeartbeatMillisecondInterval;
    // counts the number of heartbeats during three Heartbeat cronjob runs and calculates the average number of heartbeats in one interval
    const workerCountAverage = Math.floor(
      (await this.redis.zcount(this.heartBeatKey, intervalAgo, now)) /
        this.intervalTimesToCheckWorkerCount,
    );
    const workerCount = Math.max(workerCountAverage, 1);
    await this.cacheService.setWorkerCount(
      workerCount,
      workerCountMillisecondInterval,
    );
    return workerCount;
  }

  async getWorkerCount() {
    const workerCount = await this.cacheService.getWorkerCount();
    if (workerCount) return workerCount;

    return await this.setWorkerCountToCache();
  }

  // Calculate the standard stock amount of transaction count inventory
  // based on the number of workers in the standing proxy
  async getStandardTxLimitStockAmount(limit: number) {
    const workerCount = await this.getWorkerCount();
    const txCountStockStandardAmount = Math.floor(limit / (5 * workerCount));
    if (txCountStockStandardAmount < 1) return 1;
    return txCountStockStandardAmount;
  }

  async returnSurplusTxLimitStock(key: string, rateLimit: RateLimit) {
    const countFieldName = this.txCountFieldNames.count;

    const MAX_RETRIES = 5;
    let retryCount = 0;

    while (true) {
      try {
        await this.redis.watch(key);
        const redisData = await this.redis.hmget(key, countFieldName);
        const countFieldValue = redisData[0];
        const txLimitStock = this.txLimitStockService.getTxLimitStock(key);
        if (!countFieldValue || !txLimitStock) break;

        const redisCount = Number(countFieldValue);
        const standardStock = await this.getStandardTxLimitStockAmount(
          rateLimit.limit,
        );

        const surplusStock = this.txLimitStockService.getSurplusStockAmount(
          txLimitStock,
          standardStock,
        );

        const multiResult = await this.redis
          .multi()
          .hset(key, countFieldName, redisCount - surplusStock)
          .exec();
        if (!multiResult)
          throw new Error('Cannot set transaction rate to redis');
        txLimitStock.stock -= surplusStock;
        this.txLimitStockService.setTxLimitStock(key, txLimitStock);
        break;
      } catch (err) {
        if (retryCount >= MAX_RETRIES) {
          throw err;
        }
        retryCount++;
      }
    }
  }

  async resetTxLimitStock(key: string, rateLimit: RateLimit) {
    const rateLimitIntervalMs = rateLimit.interval * 1000;
    const countFieldName = this.txCountFieldNames.count;
    const createdAtFieldName = this.txCountFieldNames.createdAt;

    const MAX_RETRIES = 5;
    let retryCount = 0;

    while (true) {
      try {
        await this.redis.watch(key);
        const redisData = await this.redis.hmget(
          key,
          countFieldName,
          createdAtFieldName,
        );
        const countFieldValue = redisData[0];
        const createdAtFieldValue = redisData[1];
        const newStock = await this.getStandardTxLimitStockAmount(
          rateLimit.limit,
        );
        const now = Date.now();

        // datastore value is not set
        if (!(countFieldValue && createdAtFieldValue)) {
          const multiResult = await this.redis
            .multi()
            .hset(key, countFieldName, newStock, createdAtFieldName, now)
            .exec();
          const newTxLimitStock = {
            stock: newStock,
            counter: 0,
            isDatastoreLimit: false,
            createdAt: now,
          };
          const txLimitStock = this.txLimitStockService.getTxLimitStock(key);
          if (multiResult) {
            if (
              this.txLimitStockService.isNeedTxLimitStockUpdate(
                txLimitStock,
                rateLimit,
              )
            ) {
              this.txLimitStockService.setTxLimitStock(key, newTxLimitStock);
            }
            break;
          }
          throw new Error('Cannot set transaction rate to redis');
        }

        // datastore value is set
        const redisCount = Number(countFieldValue);
        const createdAt = Number(createdAtFieldValue);
        const counterAge = now - createdAt;

        // It does not have to reset redis data
        if (rateLimitIntervalMs > counterAge) {
          if (redisCount + newStock > rateLimit.limit) {
            const newTxLimitStock = {
              stock: 0,
              counter: 0,
              isDatastoreLimit: true,
              createdAt: now,
            };
            this.txLimitStockService.setTxLimitStock(key, newTxLimitStock);
            await this.redis.unwatch();
            break;
          } else {
            const multiResult = await this.redis
              .multi()
              .hset(
                key,
                countFieldName,
                redisCount + newStock,
                createdAtFieldName,
                createdAt,
              )
              .exec();
            const newTxLimitStock = {
              stock: newStock,
              counter: 0,
              isDatastoreLimit: false,
              createdAt: now,
            };
            const txLimitStock = this.txLimitStockService.getTxLimitStock(key);
            if (multiResult) {
              if (
                this.txLimitStockService.isNeedTxLimitStockUpdate(
                  txLimitStock,
                  rateLimit,
                )
              ) {
                this.txLimitStockService.setTxLimitStock(key, newTxLimitStock);
              }
              break;
            }
            throw new Error('Cannot set transaction rate to redis');
          }
        }
        // It has to reset redis data
        else {
          const multiResult = await this.redis
            .multi()
            .hset(key, countFieldName, newStock, createdAtFieldName, now)
            .exec();
          const newTxLimitStock = {
            stock: newStock,
            counter: 0,
            isDatastoreLimit: false,
            createdAt: now,
          };
          const txLimitStock = this.txLimitStockService.getTxLimitStock(key);
          if (multiResult) {
            if (
              this.txLimitStockService.isNeedTxLimitStockUpdate(
                txLimitStock,
                rateLimit,
              )
            ) {
              this.txLimitStockService.setTxLimitStock(key, newTxLimitStock);
            }
            break;
          }
          throw new Error('Cannot set transaction rate to redis');
        }
      } catch (err) {
        if (retryCount >= MAX_RETRIES) {
          throw err;
        }
        retryCount++;
      }
    }
  }

  async getAllowedTxCount(
    from: string,
    to: string,
    methodId: string,
    rateLimit: RateLimit,
  ) {
    const key = this.txLimitStockService.getTxLimitStockKey(
      from,
      to,
      methodId,
      rateLimit,
    );
    let txLimitStock = this.txLimitStockService.getTxLimitStock(key);

    if (
      this.txLimitStockService.isNeedTxLimitStockUpdate(txLimitStock, rateLimit)
    ) {
      await this.resetTxLimitStock(key, rateLimit);
    } else if (
      this.txLimitStockService.isSurplusStock(
        txLimitStock,
        rateLimit,
        await this.getStandardTxLimitStockAmount(rateLimit.limit),
      )
    ) {
      await this.returnSurplusTxLimitStock(key, rateLimit);
    }
    this.txLimitStockService.consumeStock(key);
    txLimitStock = this.txLimitStockService.getTxLimitStock(key);
    return txLimitStock ? txLimitStock.stock : 0;
  }

  async getBlockNumber(requestContext: RequestContext) {
    const key = this.cacheService.getBlockNumberCacheKey(requestContext);
    const cache = await this.cacheService.getBlockNumber(key);
    if (cache) return cache;
    const blockNumber = (await this.redis.get(key)) ?? '';
    if (blockNumber)
      await this.cacheService.setBlockNumber(
        key,
        blockNumber,
        this.blockNumberCacheExpireSec * 1000,
      );
    return blockNumber;
  }

  async setBlockNumber(requestContext: RequestContext, blockNumber: string) {
    const key = this.cacheService.getBlockNumberCacheKey(requestContext);
    await this.redis.setex(key, this.blockNumberCacheExpireSec, blockNumber);
    await this.cacheService.setBlockNumber(
      key,
      blockNumber,
      this.blockNumberCacheExpireSec * 1000,
    );
  }
}
