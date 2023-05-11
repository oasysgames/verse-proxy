import { Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Between } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  HeartbeatMillisecondInterval,
  workerCountMillisecondInterval,
} from 'src/constants';
import { RateLimit } from 'src/config/transactionAllowList';
import { CacheService } from './cache.service';
import { RequestContext } from 'src/datastore/entities';
import {
  TransactionCount,
  BlockNumberCache,
  Heartbeat,
} from 'src/datastore/entities';
import { blockNumberCacheExpireSecLimit } from 'src/datastore/consts';
import { TxCountInventoryService } from './txCountInventory.service';

@Injectable()
export class RdbService {
  private blockNumberCacheExpireSec: number;

  constructor(
    private configService: ConfigService,
    private cacheService: CacheService,
    private txCountInventoryService: TxCountInventoryService,
    @InjectRepository(Heartbeat)
    @Optional()
    private heartbeatRepository: Repository<Heartbeat>,
    @InjectRepository(TransactionCount)
    @Optional()
    private txCountRepository: Repository<TransactionCount>,
    @InjectRepository(BlockNumberCache)
    @Optional()
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

  async setHeartBeat() {
    const now = Date.now();
    const entity = new Heartbeat();
    entity.created_at = now;
    await this.heartbeatRepository.save(entity);
    if (now % 10 === 0) {
      await this.heartbeatRepository.delete({
        created_at: LessThan(now - HeartbeatMillisecondInterval),
      });
    }
  }

  // `setHeartBeat` is executed at regular intervals by a cronjob.
  // The number of workers is the number of heartbeats counted
  // from the time before the interval when `setHeartBeat` is executed to the current time.
  async setWorkerCountToCache() {
    const now = Date.now();
    const interval = HeartbeatMillisecondInterval - 1;
    const intervalAgo = now - interval;
    let workerCount = await this.heartbeatRepository.count({
      where: {
        created_at: Between(intervalAgo, now),
      },
    });
    workerCount = Math.max(workerCount, 1);
    await this.cacheService.setWorkerCount(
      workerCount,
      workerCountMillisecondInterval,
    );
    return workerCount;
  }

  async getWorkerCount() {
    const workerCount = await this.cacheService.getWorkerCount();
    if (workerCount) return workerCount;

    return await this.setWorkerCountToCache();
  }

  // Calculate the standard value of transaction count inventory
  // based on the number of workers in the standing proxy
  async getTxCountStockStandardAmount(limit: number) {
    const workerCount = await this.getWorkerCount();
    const txCountStockStandardAmount = Math.floor(limit / (5 * workerCount));
    if (txCountStockStandardAmount < 1) return 1;
    return txCountStockStandardAmount;
  }

  async resetAllowedTxCount(key: string, rateLimit: RateLimit) {
    const rateLimitIntervalMs = rateLimit.interval * 1000;

    const MAX_RETRIES = 5;
    let retry = true;
    let retryCount = 0;

    while (retry) {
      try {
        const transactionalEntityManager = this.txCountRepository.manager;

        await transactionalEntityManager.transaction(
          'SERIALIZABLE',
          async (transactionManager) => {
            const txCountInventory =
              this.txCountInventoryService.getAllowedTxCount(key);
            if (
              !this.txCountInventoryService.isNeedTxCountUpdate(
                txCountInventory,
                rateLimit,
              )
            ) {
              retry = false;
              return;
            }

            const newStock = await this.getTxCountStockStandardAmount(
              rateLimit.limit,
            );
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
              const newTxCountInventory = {
                value: newStock,
                isDatastoreLimit: false,
                createdAt: new Date(),
              };
              this.txCountInventoryService.setTxCount(key, newTxCountInventory);
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
                const newTxCountInventory = {
                  value: 0,
                  isDatastoreLimit: true,
                  createdAt: new Date(),
                };
                this.txCountInventoryService.setTxCount(
                  key,
                  newTxCountInventory,
                );
                retry = false;
                return;
              } else {
                txCount.count = txCount.count + newStock;

                await transactionManager.save(txCount);
                const newTxCountInventory = {
                  value: newStock,
                  isDatastoreLimit: false,
                  createdAt: new Date(),
                };
                this.txCountInventoryService.setTxCount(
                  key,
                  newTxCountInventory,
                );
                retry = false;
                return;
              }
            }
            // It has to reset datastore data
            else {
              txCount.count = newStock;
              txCount.created_at = new Date();
              await transactionManager.save(txCount);
              const newTxCountInventory = {
                value: newStock,
                isDatastoreLimit: false,
                createdAt: new Date(),
              };
              this.txCountInventoryService.setTxCount(key, newTxCountInventory);
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
  }

  async getAllowedTxCount(
    from: string,
    to: string,
    methodId: string,
    rateLimit: RateLimit,
  ) {
    const key = this.txCountInventoryService.getAllowedTxCountCacheKey(
      from,
      to,
      methodId,
      rateLimit,
    );
    let txCountInventory = this.txCountInventoryService.getAllowedTxCount(key);

    if (
      this.txCountInventoryService.isNeedTxCountUpdate(
        txCountInventory,
        rateLimit,
      )
    ) {
      await this.resetAllowedTxCount(key, rateLimit);
    }
    this.txCountInventoryService.reduceAllowedTxCount(key);
    txCountInventory = this.txCountInventoryService.getAllowedTxCount(key);
    return txCountInventory ? txCountInventory.value : 0;
  }

  async getBlockNumber(requestContext: RequestContext) {
    const key = this.cacheService.getBlockNumberCacheKey(requestContext);
    const cache = await this.cacheService.getBlockNumber(key);
    if (cache) return cache;

    const blockNumber = await this.bnCacheRepository.findOneBy({ name: key });

    if (
      !blockNumber ||
      Date.now() >=
        blockNumber.updated_at + this.blockNumberCacheExpireSec * 1000
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
    const entity = await this.bnCacheRepository.findOneBy({
      name: key,
    });
    if (entity) {
      entity.value = blockNumber;
      entity.updated_at = Date.now();
      await this.bnCacheRepository.save(entity);
    } else {
      const newBnCache = new BlockNumberCache();
      newBnCache.name = key;
      newBnCache.value = blockNumber;
      newBnCache.updated_at = Date.now();

      await this.bnCacheRepository.save(newBnCache);
    }
    await this.cacheService.setBlockNumber(
      key,
      blockNumber,
      this.blockNumberCacheExpireSec * 1000,
    );
  }
}
