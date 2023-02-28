import { Injectable, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService {
  private rateLimitKey: string;

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {
    this.rateLimitKey = 'rate-limit';
  }

  async setTransactionHistory(key: string, value: string, timestamp: number) {
    return await this.redis.zadd(key, timestamp, value);
  }

  async getTransactionHistoryCount(
    key: string,
    startTimestamp: number,
    endTimestamp: number,
  ) {
    return await this.redis.zcount(key, startTimestamp, endTimestamp);
  }
}
