import { Injectable, Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { createHash } from 'crypto';
import { RequestContext } from 'src/datastore/entities';

@Injectable()
export class CacheService {
  private workerCountKey = 'worker_count';

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async getWorkerCount() {
    return await this.cacheManager.get<number>(this.workerCountKey);
  }

  async setWorkerCount(value: number) {
    await this.cacheManager.set(this.workerCountKey, value);
  }

  async getBlockNumber(key: string) {
    return await this.cacheManager.get<string>(key);
  }

  async setBlockNumber(key: string, value: string, ttl: number) {
    await this.cacheManager.set(key, value, ttl);
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
