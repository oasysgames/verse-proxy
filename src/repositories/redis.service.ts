import { Injectable, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { RateLimit } from 'src/config/transactionAllowList';
import { CacheService } from './cache.service';
import { RequestContext, TransactionCountCache } from 'src/entities';
import { blockNumberCacheExpireSecLimit } from 'src/consts';

@Injectable()
export class RedisService {
  private blockNumberCacheExpireSec: number;

  constructor(
    private configService: ConfigService,
    private cacheService: CacheService,
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

  async getAllowedTxCountFromRedis(key: string, rateLimit: RateLimit) {
    const rateLimitIntervalMs = rateLimit.interval * 1000;
    const countFieldName = 'count';
    const createdAtFieldName = 'created_at';

    let retry = true;
    let txCountCache: TransactionCountCache = {
      value: 0,
      isDatastoreLimit: false,
    };
    let ttl = 0; // milliseconds
    while (retry) {
      await this.redis.watch(key);
      const redisData = await this.redis.hmget(
        key,
        countFieldName,
        createdAtFieldName,
      );
      const countFieldValue = redisData[0];
      const createdAtFieldValue = redisData[1];
      const newStock = this.cacheService.getTxCountStock(rateLimit.limit);

      // datastore value is not set
      if (!(countFieldValue && createdAtFieldValue)) {
        const now = Date.now();
        const multiResult = await this.redis
          .multi()
          .hset(key, countFieldName, newStock, createdAtFieldName, now)
          .exec();
        txCountCache = {
          value: newStock,
          isDatastoreLimit: false,
        };
        ttl = rateLimitIntervalMs;
        if (multiResult) retry = false;
        break;
      }

      // datastore value is set
      const redisCount = Number(countFieldValue);
      const createdAt = Number(createdAtFieldValue);
      const now = Date.now();
      const counterAge = now - createdAt;

      // It does not have to reset redis data
      if (rateLimitIntervalMs > counterAge) {
        if (redisCount + newStock > rateLimit.limit) {
          txCountCache = {
            value: 0,
            isDatastoreLimit: true,
          };
          ttl = createdAt + rateLimitIntervalMs - now;
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
          txCountCache = {
            value: newStock,
            isDatastoreLimit: false,
          };
          ttl = createdAt + rateLimitIntervalMs - now;
          if (multiResult) retry = false;
        }
      }
      // It has to reset redis data
      else {
        const multiResult = await this.redis
          .multi()
          .hset(key, countFieldName, newStock, createdAtFieldName, now)
          .exec();
        txCountCache = {
          value: newStock,
          isDatastoreLimit: false,
        };
        ttl = rateLimitIntervalMs;
        if (multiResult) retry = false;
      }
    }
    await this.cacheService.setTxCount(key, txCountCache, ttl);
    return txCountCache.value;
  }

  async getAllowedTxCount(
    from: string,
    to: string,
    methodId: string,
    rateLimit: RateLimit,
  ) {
    const key = this.cacheService.getAllowedTxCountCacheKey(
      from,
      to,
      methodId,
      rateLimit,
    );
    const cache = await this.cacheService.getTxCount(key);

    if (cache === undefined) {
      return await this.getAllowedTxCountFromRedis(key, rateLimit);
    } else {
      if (cache.value > 0 || cache.isDatastoreLimit) return cache.value;
      return await this.getAllowedTxCountFromRedis(key, rateLimit);
    }
  }

  async reduceTxCount(
    from: string,
    to: string,
    methodId: string,
    rateLimit: RateLimit,
  ) {
    const key = this.cacheService.getAllowedTxCountCacheKey(
      from,
      to,
      methodId,
      rateLimit,
    );
    const cache = await await this.cacheService.getTxCount(key);

    if (!cache) return;
    cache.value = cache.value - 1;
    await this.cacheService.resetTxCount(key, cache);
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
