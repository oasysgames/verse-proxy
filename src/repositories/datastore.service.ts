import { Injectable, Inject, Optional } from '@nestjs/common';
import { Redis } from 'ioredis';
import { RateLimit } from 'src/config/transactionAllowList';
import { RequestContext } from 'src/entities';
import { RedisService } from './redis.service';

@Injectable()
export class DatastoreService {
  private datastore: string;

  constructor(
    private redisService: RedisService,
    @Inject('REDIS') @Optional() redis: Redis,
  ) {
    if (redis) {
      this.datastore = 'redis';
    }
  }

  async getAllowedTxCount(
    from: string,
    to: string,
    methodId: string,
    rateLimit: RateLimit,
  ) {
    let count = 0;
    switch (this.datastore) {
      case 'redis':
        count = await this.redisService.getAllowedTxCount(
          from,
          to,
          methodId,
          rateLimit,
        );
        break;
    }
    return count;
  }

  async reduceTxCount(
    from: string,
    to: string,
    methodId: string,
    rateLimits: RateLimit[],
  ) {
    await Promise.all(
      rateLimits.map(async (rateLimit): Promise<void> => {
        switch (this.datastore) {
          case 'redis':
            await this.redisService.reduceTxCount(
              from,
              to,
              methodId,
              rateLimit,
            );
            break;
        }
      }),
    );
  }

  async getBlockNumberCache(requestContext: RequestContext) {
    let blockNumberCache = '';

    switch (this.datastore) {
      case 'redis':
        blockNumberCache = await this.redisService.getBlockNumber(
          requestContext,
        );
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
        await this.redisService.setBlockNumber(requestContext, blockNumber);
        break;
    }
  }
}
