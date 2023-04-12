import { Injectable, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Redis } from 'ioredis';
import { createHash } from 'crypto';
import { RateLimit } from 'src/config/transactionAllowList';
import { RequestContext } from 'src/entities';

interface TxCount {
  value: number;
  isDatastoreLimit: boolean;
}

@Injectable()
export class DatastoreService {
  private datastore: string;
  private redis: Redis;
  private processCount: number;
  private blockNumberCacheExpire: number;

  constructor(
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject('REDIS') @Optional() redis: Redis,
  ) {
    this.processCount = process.env.CLUSTER_PROCESS
      ? parseInt(process.env.CLUSTER_PROCESS, 10)
      : 1;

    if (redis) {
      this.datastore = 'redis';
      this.redis = redis;
    }

    const blockNumberCacheExpireLimit = 120; // 2min
    const blockNumberCacheExpire =
      this.configService.get<number>('blockNumberCacheExpire') || 0;

    if (blockNumberCacheExpire > blockNumberCacheExpireLimit) {
      throw new Error(
        `block_number_cache_expire limit is ${blockNumberCacheExpireLimit}. BLOCK_NUMBER_CACHE_EXPIRE_SEC is over ${blockNumberCacheExpireLimit}`,
      );
    }
    this.blockNumberCacheExpire = blockNumberCacheExpire;
  }

  async getAllowedTxCountFromRedis(
    key: string,
    rateLimit: RateLimit,
    stock: number,
  ) {
    const rateLimitIntervalMs = rateLimit.interval * 1000;
    const countFieldName = 'count';
    const createdAtFieldName = 'created_at';

    let retry = true;
    let txCount: TxCount = {
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

      // datastore value is not set
      if (!(countFieldValue && createdAtFieldValue)) {
        const now = Date.now();
        const multiResult = await this.redis
          .multi()
          .hset(key, countFieldName, stock, createdAtFieldName, now)
          .exec();
        txCount = {
          value: stock,
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
        if (redisCount + stock > rateLimit.limit) {
          txCount = {
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
              redisCount + stock,
              createdAtFieldName,
              createdAt,
            )
            .exec();
          txCount = {
            value: stock,
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
          .hset(key, countFieldName, stock, createdAtFieldName, now)
          .exec();
        txCount = {
          value: stock,
          isDatastoreLimit: false,
        };
        ttl = rateLimitIntervalMs;
        if (multiResult) retry = false;
      }
    }
    await this.cacheManager.set(key, txCount, ttl);
    return txCount.value;
  }

  async getAllowedTxCountFromDataStore(key: string, rateLimit: RateLimit) {
    const stock = this.getTxCountStock(rateLimit.limit);
    let count = 0;
    switch (this.datastore) {
      case 'redis':
        count = await this.getAllowedTxCountFromRedis(key, rateLimit, stock);
        break;
    }
    return count;
  }

  async getAllowedTxCount(
    from: string,
    to: string,
    methodId: string,
    rateLimit: RateLimit,
  ) {
    const key = this.getAllowedTxCountKey(from, to, methodId, rateLimit);
    const cache = await this.cacheManager.get<TxCount>(key);

    if (cache === undefined) {
      return await this.getAllowedTxCountFromDataStore(key, rateLimit);
    } else {
      if (cache.value > 0 || cache.isDatastoreLimit) return cache.value;
      return await this.getAllowedTxCountFromDataStore(key, rateLimit);
    }
  }

  getTxCountStock(limit: number): number {
    const stockCount1 = Math.floor((limit / 10) * this.processCount);
    const stockCount2 = Math.floor((limit / 3) * this.processCount);

    if (stockCount1 >= 1) {
      return stockCount1;
    } else if (stockCount2 >= 1) {
      return stockCount2;
    }
    return 1;
  }

  async reduceTxCount(
    from: string,
    to: string,
    methodId: string,
    rateLimits: RateLimit[],
  ) {
    await Promise.all(
      rateLimits.map(async (rateLimit): Promise<void> => {
        const key = this.getAllowedTxCountKey(from, to, methodId, rateLimit);
        const cache = await this.cacheManager.get<TxCount>(key);

        if (!cache) return;
        cache.value = cache.value - 1;
        const ttl = await this.cacheManager.store.ttl(key);
        await this.cacheManager.set(key, cache, ttl);
      }),
    );
  }

  async getBlockNumberCache(requestContext: RequestContext) {
    let blockNumberCache = '';

    switch (this.datastore) {
      case 'redis':
        const key = this.getBlockNumberCacheKey(requestContext);
        blockNumberCache = (await this.redis.get(key)) ?? '';
        break;
    }

    return blockNumberCache;
  }

  async setBlockNumberCache(
    requestContext: RequestContext,
    blockNumber: string,
  ) {
    switch (this.datastore) {
      case 'redis':
        const key = this.getBlockNumberCacheKey(requestContext);
        await this.redis.setex(key, this.blockNumberCacheExpire, blockNumber);
        break;
    }
  }

  private getAllowedTxCountKey(
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

  private getBlockNumberCacheKey(requestContext: RequestContext) {
    const clientIp = requestContext.ip;
    const headers = requestContext.headers;

    const userAgent =
      typeof headers['sec-ch-ua'] === 'string'
        ? headers['sec-ch-ua']
        : headers['user-agent'];

    const clientInfo = userAgent ? clientIp + userAgent : clientIp + '*';
    const hash = createHash('sha256').update(clientInfo).digest('hex');
    return `block_number_cache_${hash}`;
  }
}
