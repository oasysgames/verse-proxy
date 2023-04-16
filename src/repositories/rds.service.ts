import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { RateLimit } from 'src/config/transactionAllowList';
import { CacheService } from './cache.service';
import { RequestContext, TxCountCache, BlockNumberCache } from 'src/entities';

@Injectable()
export class RdbService {
  private blockNumberCacheExpire: number;

  constructor(
    private configService: ConfigService,
    private cacheService: CacheService,
    @InjectRepository(BlockNumberCache)
    private bnCacheRepository: Repository<BlockNumberCache>,
  ) {
    const blockNumberCacheExpireLimit = 120; // 2min
    const blockNumberCacheExpire =
      this.configService.get<number>('blockNumberCacheExpire') || 0;

    if (blockNumberCacheExpire > blockNumberCacheExpireLimit) {
      throw new Error(
        `block_number_cache_expire limit is ${blockNumberCacheExpireLimit}. BLOCK_NUMBER_CACHE_EXPIRE_SEC is over ${blockNumberCacheExpireLimit}`,
      );
    }
    this.blockNumberCacheExpire = blockNumberCacheExpire;
  }

  async getBlockNumber(requestContext: RequestContext) {
    const key = this.cacheService.getBlockNumberCacheKey(requestContext);
    const cache = await this.cacheService.getBlockNumber(key);
    if (cache) return cache;

    const blockNumber = await this.bnCacheRepository.findOneBy({ name: key });

    if (
      !blockNumber ||
      Date.now() + this.blockNumberCacheExpire * 1000 >=
        blockNumber.updated_at.getTime()
    ) {
      return '';
    }

    await this.cacheService.setBlockNumber(
      key,
      blockNumber.value,
      this.blockNumberCacheExpire * 1000,
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
      const newEntity = {
        name: key,
        value: blockNumber,
        updated_at: new Date(),
      };
      await this.bnCacheRepository.save(newEntity);
    }
    await this.cacheService.setBlockNumber(
      key,
      blockNumber,
      this.blockNumberCacheExpire * 1000,
    );
  }
}
