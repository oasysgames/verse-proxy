import { Injectable, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async setTransactionHistory(
    key: string,
    value: Buffer,
    timestamp: number,
    removeDataTimestamp: number,
  ) {
    await this.redis.zadd(key, timestamp, value);
    if (timestamp % 5 === 0)
      await this.redis.zremrangebyscore(key, 0, removeDataTimestamp);
  }

  async getTransactionHistoryCount(
    key: string,
    startTimestamp: number,
    endTimestamp: number,
  ) {
    return await this.redis.zcount(key, startTimestamp, endTimestamp);
  }
}
