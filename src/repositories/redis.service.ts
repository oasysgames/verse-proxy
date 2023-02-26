import { Injectable, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService {
  private rateLimitKey: string;

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {
    this.rateLimitKey = 'rate-limit';
  }

  async setTransactionHistory(value: string, timestamp: number) {
    return await this.redis.zadd(this.rateLimitKey, timestamp, value);
  }

  async getTransactionHistory(startTimestamp: number, endTimestamp: number) {
    return await this.redis.zrange(
      this.rateLimitKey,
      startTimestamp,
      endTimestamp,
      'BYSCORE',
    );
  }
}
