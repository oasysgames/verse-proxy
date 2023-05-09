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
import { TxCountInventoryService } from './txCountInventory.service';

@Injectable()
export class RedisService {
  private blockNumberCacheExpireSec: number;
  private heartBeatKey = 'heartbeat';

  constructor(
    private configService: ConfigService,
    private cacheService: CacheService,
    private txCountInventoryService: TxCountInventoryService,
    @Inject('REDIS') @Optional() private redis: Redis,
  ) {
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
    await this.redis.zadd(this.heartBeatKey, now, now);
  }

  // `setHeartBeat` is executed at regular intervals by a cronjob.
  // The number of workers is the number of heartbeats counted
  // from the time before the interval when `setHeartBeat` is executed to the current time.
  async setWorkerCountToCache() {
    const now = Date.now();
    const interval = HeartbeatMillisecondInterval - 1;
    const intervalAgo = now - interval;
    let workerCount = await this.redis.zcount(
      this.heartBeatKey,
      intervalAgo,
      now,
    );
    workerCount = Math.max(workerCount, 1);
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

  // Calculate the standard value of transaction count inventory
  // based on the number of workers in the standing proxy
  async getTxCountStockStandardAmount(limit: number) {
    const workerCount = await this.getWorkerCount();
    const txCountStockStandardAmount = Math.floor(limit / (5 * workerCount));
    if (txCountStockStandardAmount < 1) return 1;
    return txCountStockStandardAmount;
  }

  async resetAllowedTxCount(key: string, rateLimit: RateLimit) {
    const rateLimitIntervalMs = rateLimit.interval * 1000;
    const countFieldName = 'count';
    const createdAtFieldName = 'created_at';

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
        const newStock = await this.getTxCountStockStandardAmount(
          rateLimit.limit,
        );

        // datastore value is not set
        if (!(countFieldValue && createdAtFieldValue)) {
          const now = Date.now();
          const multiResult = await this.redis
            .multi()
            .hset(key, countFieldName, newStock, createdAtFieldName, now)
            .exec();
          const newTxCountInventory = {
            value: newStock,
            isDatastoreLimit: false,
            createdAt: new Date(),
          };
          const txCountInventory =
            this.txCountInventoryService.getAllowedTxCount(key);
          if (multiResult) {
            if (
              this.txCountInventoryService.isNeedTxCountUpdate(
                txCountInventory,
                rateLimit,
              )
            ) {
              this.txCountInventoryService.setTxCount(key, newTxCountInventory);
            }
            break;
          }
          throw new Error('Cannot set transaction rate to redis');
        }

        // datastore value is set
        const redisCount = Number(countFieldValue);
        const createdAt = Number(createdAtFieldValue);
        const now = Date.now();
        const counterAge = now - createdAt;

        // It does not have to reset redis data
        if (rateLimitIntervalMs > counterAge) {
          if (redisCount + newStock > rateLimit.limit) {
            const newTxCountInventory = {
              value: 0,
              isDatastoreLimit: true,
              createdAt: new Date(),
            };
            this.txCountInventoryService.setTxCount(key, newTxCountInventory);
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
            const newTxCountInventory = {
              value: newStock,
              isDatastoreLimit: false,
              createdAt: new Date(),
            };
            const txCountInventory =
              this.txCountInventoryService.getAllowedTxCount(key);
            if (multiResult) {
              if (
                this.txCountInventoryService.isNeedTxCountUpdate(
                  txCountInventory,
                  rateLimit,
                )
              ) {
                this.txCountInventoryService.setTxCount(
                  key,
                  newTxCountInventory,
                );
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
          const newTxCountInventory = {
            value: newStock,
            isDatastoreLimit: false,
            createdAt: new Date(),
          };
          const txCountInventory =
            this.txCountInventoryService.getAllowedTxCount(key);
          if (multiResult) {
            if (
              this.txCountInventoryService.isNeedTxCountUpdate(
                txCountInventory,
                rateLimit,
              )
            ) {
              this.txCountInventoryService.setTxCount(key, newTxCountInventory);
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
    const key = this.txCountInventoryService.getAllowedTxCountCacheKey(
      from,
      to,
      methodId,
      rateLimit,
    );
    let txCountInventory = this.txCountInventoryService.getAllowedTxCount(key);

    if (
      this.txCountInventoryService.isNeedTxCountUpdate(
        txCountInventory,
        rateLimit,
      )
    ) {
      await this.resetAllowedTxCount(key, rateLimit);
    }
    this.txCountInventoryService.reduceAllowedTxCount(key);
    txCountInventory = this.txCountInventoryService.getAllowedTxCount(key);
    return txCountInventory ? txCountInventory.value : 0;
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
