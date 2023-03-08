import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { RateLimit } from 'src/config/transactionAllowList';

@Injectable()
export class DatastoreService {
  private datastore: string;
  private redis: Redis;

  constructor(private configService: ConfigService) {
    this.datastore = this.configService.get<string>('datastore') ?? '';
    if (this.datastore === 'redis' && process.env.REDIS_URI) {
      this.redis = new Redis(process.env.REDIS_URI);
    }
  }

  async setTransactionHistory(
    from: string,
    to: string,
    methodId: string,
    txHash: string,
    rateLimits: RateLimit[],
  ) {
    const txHashByte = Buffer.from(txHash.slice(2), 'hex');

    await Promise.all(
      rateLimits.map(async (rateLimit): Promise<void> => {
        switch (this.datastore) {
          case 'redis':
            const redisKey = this.getRedisKey(from, to, methodId, rateLimit);
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
      }),
    );
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
        const redisKey = this.getRedisKey(from, to, methodId, rateLimit);
        const now = Date.now();
        const intervalAgo = this.getTimeSecondsAgo(now, rateLimit.interval);
        txCounter = await this.redis.zcount(redisKey, intervalAgo, now);
        break;
    }
    return txCounter;
  }

  private getRedisKey(
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

  private getTimeSecondsAgo(timestamp: number, interval: number) {
    const intervalAgo = timestamp - interval * 1000;

    return intervalAgo;
  }
}
