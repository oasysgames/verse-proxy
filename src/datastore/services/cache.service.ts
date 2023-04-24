import { Injectable, Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { createHash } from 'crypto';
import { RequestContext } from 'src/datastore/entities';

@Injectable()
export class CacheService {
  private processCount: number;

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {
    this.processCount = process.env.CLUSTER_PROCESS
      ? parseInt(process.env.CLUSTER_PROCESS, 10)
      : 1;
  }

  async getBlockNumber(key: string) {
    return await this.cacheManager.get<string>(key);
  }

  async setBlockNumber(key: string, value: string, ttl: number) {
    await this.cacheManager.set(key, value, ttl);
  }

  getTxCountStock(limit: number): number {
    const stockCount1 = Math.floor(limit / (10 * this.processCount));
    const stockCount2 = Math.floor(limit / (3 * this.processCount));

    if (stockCount1 >= 1) {
      return stockCount1;
    } else if (stockCount2 >= 1) {
      return stockCount2;
    }
    return 1;
  }

  getBlockNumberCacheKey(requestContext: RequestContext) {
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
