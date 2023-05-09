import { Injectable } from '@nestjs/common';
import { RateLimit } from 'src/config/transactionAllowList';
import { RequestContext } from 'src/datastore/entities';
import { RdbService } from './rdb.service';
import { RedisService } from './redis.service';

@Injectable()
export class DatastoreService {
  private datastore: string;

  constructor(
    private redisService: RedisService,
    private rdbService: RdbService,
  ) {
    const redisUri = process.env.REDIS_URI;
    const rdbUri = process.env.RDB_URI;

    if (redisUri) {
      this.datastore = 'redis';
    } else if (rdbUri) {
      this.datastore = 'rdb';
    }
  }

  async getWorkerCount() {
    let workerCount = 0;

    try {
      switch (this.datastore) {
        case 'redis':
          workerCount = await this.redisService.getWorkerCount();
          break;
        case 'rdb':
          break;
      }
      return workerCount;
    } catch (err) {
      if (err instanceof Error) {
        console.error(err.message);
      } else {
        console.error(err);
      }
      return 0;
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
        case 'rdb':
          count = await this.rdbService.getAllowedTxCount(
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

  async getBlockNumber(requestContext: RequestContext) {
    let blockNumberCache = '';

    try {
      switch (this.datastore) {
        case 'redis':
          blockNumberCache = await this.redisService.getBlockNumber(
            requestContext,
          );
          break;
        case 'rdb':
          blockNumberCache = await this.rdbService.getBlockNumber(
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

  async setBlockNumber(requestContext: RequestContext, blockNumber: string) {
    try {
      switch (this.datastore) {
        case 'redis':
          await this.redisService.setBlockNumber(requestContext, blockNumber);
          break;
        case 'rdb':
          await this.rdbService.setBlockNumber(requestContext, blockNumber);
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

  async setHeartBeat() {
    try {
      switch (this.datastore) {
        case 'redis':
          await this.redisService.setHeartBeat();
          break;
        case 'rdb':
          break;
      }
    } catch (err) {
      if (err instanceof Error) {
        console.error(err.message);
      } else {
        console.error(err);
      }
      return 0;
    }
  }

  async setWorkerCount() {
    try {
      switch (this.datastore) {
        case 'redis':
          await this.redisService.setWorkerCountToCache();
          break;
        case 'rdb':
          break;
      }
    } catch (err) {
      if (err instanceof Error) {
        console.error(err.message);
      } else {
        console.error(err);
      }
      return 0;
    }
  }
}
