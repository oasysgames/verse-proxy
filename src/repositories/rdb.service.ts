import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { RateLimit } from 'src/config/transactionAllowList';
import { CacheService } from './cache.service';
import {
  RequestContext,
  BlockNumberCache,
  TransactionCount,
  TransactionCountCache,
} from 'src/entities';
import { blockNumberCacheExpireSecLimit } from 'src/consts';

@Injectable()
export class RdbService {
  private blockNumberCacheExpireSec: number;

  constructor(
    private configService: ConfigService,
    private cacheService: CacheService,
    @InjectRepository(TransactionCount)
    private txCountRepository: Repository<TransactionCount>,
    @InjectRepository(BlockNumberCache)
    private bnCacheRepository: Repository<BlockNumberCache>,
  ) {
    const blockNumberCacheExpireSec =
      this.configService.get<number>('blockNumberCacheExpireSec') || 0;

    if (blockNumberCacheExpireSec > blockNumberCacheExpireSecLimit) {
      console.warn(
        `block_number_cache_expire limit is ${blockNumberCacheExpireSecLimit}. block_number_cache_expire is set to ${blockNumberCacheExpireSecLimit}`,
      );
      this.blockNumberCacheExpireSec = blockNumberCacheExpireSecLimit;
    } else {
      this.blockNumberCacheExpireSec = blockNumberCacheExpireSec;
    }
  }

  async getAllowedTxCountFromRdb(key: string, rateLimit: RateLimit) {
    const rateLimitIntervalMs = rateLimit.interval * 1000;

    const MAX_RETRIES = 5;
    let retry = true;
    let retryCount = 0;
    let txCountCache: TransactionCountCache = {
      value: 0,
      isDatastoreLimit: false,
    };
    let ttl = 0; // milliseconds

    while (retry) {
      try {
        const transactionalEntityManager = this.txCountRepository.manager;
        const newStock = this.cacheService.getTxCountStock(rateLimit.limit);

        await transactionalEntityManager.transaction(
          async (transactionManager) => {
            const txCount = await transactionManager.findOneBy(
              TransactionCount,
              {
                name: key,
              },
            );

            // datastore value is not set
            if (!txCount) {
              const newTxCount = new TransactionCount();
              newTxCount.name = key;
              newTxCount.count = newStock;
              newTxCount.created_at = new Date();
              await transactionManager.save(newTxCount);
              txCountCache = {
                value: newStock,
                isDatastoreLimit: false,
              };
              ttl = rateLimitIntervalMs;
              retry = false;
              return;
            }

            // datastore value is set
            const createdAt = txCount.created_at.getTime();
            const now = Date.now();
            const counterAge = now - createdAt;

            // It does not have to reset datastore data
            if (rateLimitIntervalMs > counterAge) {
              if (txCount.count + newStock > rateLimit.limit) {
                txCountCache = {
                  value: 0,
                  isDatastoreLimit: true,
                };
                ttl = createdAt + rateLimitIntervalMs - now;
                retry = false;
                return;
              } else {
                txCount.count = txCount.count + newStock;
                await transactionManager.save(txCount);
                txCountCache = {
                  value: newStock,
                  isDatastoreLimit: false,
                };
                ttl = createdAt + rateLimitIntervalMs - now;
                retry = false;
                return;
              }
            }
            // It has to reset datastore data
            else {
              txCount.count = newStock;
              txCount.created_at = new Date();
              await transactionManager.save(txCount);
              txCountCache = {
                value: newStock,
                isDatastoreLimit: false,
              };
              ttl = rateLimitIntervalMs;
              retry = false;
              return;
            }
          },
        );
      } catch (err) {
        if (retryCount >= MAX_RETRIES) {
          throw err;
        }
        retryCount++;
      }
    }
    await this.cacheService.setTxCount(key, txCountCache, ttl);
    return txCountCache.value;
  }

  async getAllowedTxCount(
    from: string,
    to: string,
    methodId: string,
    rateLimit: RateLimit,
  ) {
    const key = this.cacheService.getAllowedTxCountCacheKey(
      from,
      to,
      methodId,
      rateLimit,
    );
    const cache = await this.cacheService.getTxCount(key);

    if (cache === undefined) {
      return await this.getAllowedTxCountFromRdb(key, rateLimit);
    } else {
      if (cache.value > 0 || cache.isDatastoreLimit) return cache.value;
      return await this.getAllowedTxCountFromRdb(key, rateLimit);
    }
  }

  async reduceTxCount(
    from: string,
    to: string,
    methodId: string,
    rateLimit: RateLimit,
  ) {
    const key = this.cacheService.getAllowedTxCountCacheKey(
      from,
      to,
      methodId,
      rateLimit,
    );
    const cache = await await this.cacheService.getTxCount(key);

    if (!cache) return;
    cache.value = cache.value - 1;
    await this.cacheService.resetTxCount(key, cache);
  }

  async getBlockNumber(requestContext: RequestContext) {
    const key = this.cacheService.getBlockNumberCacheKey(requestContext);
    const cache = await this.cacheService.getBlockNumber(key);
    if (cache) return cache;

    const blockNumber = await this.bnCacheRepository.findOneBy({ name: key });

    if (
      !blockNumber ||
      Date.now() + this.blockNumberCacheExpireSec * 1000 >=
        blockNumber.updated_at.getTime()
    ) {
      return '';
    }

    await this.cacheService.setBlockNumber(
      key,
      blockNumber.value,
      this.blockNumberCacheExpireSec * 1000,
    );
    return blockNumber.value;
  }

  async setBlockNumber(requestContext: RequestContext, blockNumber: string) {
    const key = this.cacheService.getBlockNumberCacheKey(requestContext);
    const entity = await this.bnCacheRepository.findOneBy({ name: key });
    if (entity) {
      entity.value = blockNumber;
      entity.updated_at = new Date();
      await this.bnCacheRepository.save(entity);
    } else {
      const newBnCache = new BlockNumberCache();
      newBnCache.name = key;
      newBnCache.value = blockNumber;
      newBnCache.updated_at = new Date();

      await this.bnCacheRepository.save(newBnCache);
    }
    await this.cacheService.setBlockNumber(
      key,
      blockNumber,
      this.blockNumberCacheExpireSec * 1000,
    );
  }
}
