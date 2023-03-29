import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { createHash } from 'crypto';
import { RateLimit } from 'src/config/transactionAllowList';
import { RequestContext } from 'src/entities';

@Injectable()
export class DatastoreService {
  private datastore: string;
  private redis: Redis;
  private blockNumberCacheExpire: number;

  constructor(private configService: ConfigService) {
    this.datastore = this.configService.get<string>('datastore') ?? '';
    if (this.datastore === 'redis' && process.env.REDIS_URI) {
      this.redis = new Redis(process.env.REDIS_URI);
    }

    const blockNumberCacheExpireLimit = 120; // 2min
    const blockNumberCacheExpire =
      this.configService.get<number>('blockNumberCacheExpire') || 0;

    if (blockNumberCacheExpire > blockNumberCacheExpireLimit) {
      throw new Error(
        `block_number_cache_expire limit is ${blockNumberCacheExpireLimit}. BLOCK_NUMBER_CACHE_EXPIRE is over ${blockNumberCacheExpireLimit}`,
      );
    }
    this.blockNumberCacheExpire = blockNumberCacheExpire;
  }

  async setTransactionHistory(
    from: string,
    to: string,
    methodId: string,
    txHash: string,
    rateLimit: RateLimit,
  ) {
    const txHashByte = Buffer.from(txHash.slice(2), 'hex');

    switch (this.datastore) {
      case 'redis':
        const redisKey = this.getTransactionHistoryKey(
          from,
          to,
          methodId,
          rateLimit,
        );
        const now = Date.now();
        const removeDataTimestamp =
          this.getTimeSecondsAgo(now, rateLimit.interval) - 1;
        const pipeline = this.redis.pipeline();
        pipeline.zadd(redisKey, now, txHashByte);
        if (now % 5 === 0)
          pipeline.zremrangebyscore(redisKey, 0, removeDataTimestamp);
        await pipeline.exec((err) => {
          if (err) console.error(err);
        });
        break;
    }
  }

  async getTransactionHistoryCount(
    from: string,
    to: string,
    methodId: string,
    rateLimit: RateLimit,
  ) {
    let txCounter = 0;

    switch (this.datastore) {
      case 'redis':
        const redisKey = this.getTransactionHistoryKey(
          from,
          to,
          methodId,
          rateLimit,
        );
        const now = Date.now();
        const intervalAgo = this.getTimeSecondsAgo(now, rateLimit.interval);
        txCounter = await this.redis.zcount(redisKey, intervalAgo, now);
        break;
    }
    return txCounter;
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
        await this.redis.set(key, blockNumber);
        await this.redis.expire(key, this.blockNumberCacheExpire);
        break;
    }
  }

  private getTransactionHistoryKey(
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
    const ipAddress = requestContext.ip;
    const userAgent = this.isStringArray(requestContext.headers['sec-ch-ua'])
      ? requestContext.headers['sec-ch-ua'].join()
      : requestContext.headers['user-agent'];

    const clientInfo = userAgent ? ipAddress + userAgent : ipAddress + '*';
    const hash = createHash('sha256').update(clientInfo).digest('hex');
    return `block_number_cache_${hash}`;
  }

  private getTimeSecondsAgo(timestamp: number, interval: number) {
    const intervalAgo = timestamp - interval * 1000;

    return intervalAgo;
  }

  // todo: set typecheck.service
  private isStringArray(value: any): value is string[] {
    if (!Array.isArray(value)) {
      return false;
    }
    return value.every((item) => typeof item === 'string');
  }
}
