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

    try {
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
    } catch (err) {
      if (err instanceof Error) {
        console.error(err.message);
      } else {
        console.error(err);
      }
      return 0;
    }
  }

  async reduceTxCount(
    from: string,
    to: string,
    methodId: string,
    rateLimits: RateLimit[],
  ) {
    await Promise.all(
      rateLimits.map(async (rateLimit): Promise<void> => {
        try {
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
        } catch (err) {
          if (err instanceof Error) {
            console.error(err.message);
          } else {
            console.error(err);
          }
          return;
        }
      }),
    );
  }

  async getBlockNumberCache(requestContext: RequestContext) {
    let blockNumberCache = '';

    try {
      switch (this.datastore) {
        case 'redis':
          blockNumberCache = await this.redisService.getBlockNumber(
            requestContext,
          );
          break;
      }
      return blockNumberCache;
    } catch (err) {
      if (err instanceof Error) {
        console.error(err.message);
      } else {
        console.error(err);
      }
      return '';
    }
  }

  async setBlockNumberCache(
    requestContext: RequestContext,
    blockNumber: string,
  ) {
    try {
      switch (this.datastore) {
        case 'redis':
          await this.redisService.setBlockNumber(requestContext, blockNumber);
          break;
      }
    } catch (err) {
      if (err instanceof Error) {
        console.error(err.message);
      } else {
        console.error(err);
      }
      return;
    }
  }
}
