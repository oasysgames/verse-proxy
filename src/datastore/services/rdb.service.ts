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
import { TransactionLimitStockService } from 'src/datastore/services';

@Injectable()
export class RdbService {
  private blockNumberCacheExpireSec: number;
  private intervalTimesToCheckWorkerCount: number;

  constructor(
    private configService: ConfigService,
    private cacheService: CacheService,
    private txLimitStockService: TransactionLimitStockService,
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
    this.intervalTimesToCheckWorkerCount = 3;
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
        created_at: LessThan(
          now -
            this.intervalTimesToCheckWorkerCount * HeartbeatMillisecondInterval,
        ),
      });
    }
  }

  // `setHeartBeat` is executed at regular intervals by a cronjob.
  // The number of workers is the number of heartbeats counted
  // from the time before the interval when `setHeartBeat` is executed to the current time.
  async setWorkerCountToCache() {
    const now = Date.now();
    const intervalAgo =
      now - this.intervalTimesToCheckWorkerCount * HeartbeatMillisecondInterval;
    // counts the number of heartbeats during three Heartbeat cronjob runs and calculates the average number of heartbeats in one interval
    const workerCountAverage = Math.floor(
      (await this.heartbeatRepository.count({
        where: {
          created_at: Between(intervalAgo, now),
        },
      })) / this.intervalTimesToCheckWorkerCount,
    );
    const workerCount = Math.max(workerCountAverage, 1);
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
  async getStandardTxLimitStockAmount(limit: number) {
    const workerCount = await this.getWorkerCount();
    const txCountStockStandardAmount = Math.floor(limit / (5 * workerCount));
    if (txCountStockStandardAmount < 1) return 1;
    return txCountStockStandardAmount;
  }

  async resetTxLimitStock(key: string, rateLimit: RateLimit) {
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
            const txLimitStock = this.txLimitStockService.getTxLimitStock(key);
            if (
              !this.txLimitStockService.isNeedTxLimitStockUpdate(
                txLimitStock,
                rateLimit,
              )
            ) {
              retry = false;
              return;
            }

            const newStock = await this.getStandardTxLimitStockAmount(
              rateLimit.limit,
            );
            const txCount = await transactionManager.findOneBy(
              TransactionCount,
              {
                name: key,
              },
            );
            const now = Date.now();

            // datastore value is not set
            if (!txCount) {
              const newTxCount = new TransactionCount();
              newTxCount.name = key;
              newTxCount.count = newStock;
              newTxCount.created_at = now;
              await transactionManager.save(newTxCount);
              const newTxLimitStock = {
                stock: newStock,
                counter: 0,
                isDatastoreLimit: false,
                createdAt: now,
              };
              this.txLimitStockService.setTxLimitStock(key, newTxLimitStock);
              retry = false;
              return;
            }

            // datastore value is set
            const createdAt = txCount.created_at;
            const counterAge = now - createdAt;

            // It does not have to reset datastore data
            if (rateLimitIntervalMs > counterAge) {
              if (txCount.count + newStock > rateLimit.limit) {
                const newTxLimitStock = {
                  stock: 0,
                  counter: 0,
                  isDatastoreLimit: true,
                  createdAt: now,
                };
                this.txLimitStockService.setTxLimitStock(key, newTxLimitStock);
                retry = false;
                return;
              } else {
                txCount.count = txCount.count + newStock;

                await transactionManager.save(txCount);
                const newTxLimitStock = {
                  stock: newStock,
                  counter: 0,
                  isDatastoreLimit: false,
                  createdAt: now,
                };
                this.txLimitStockService.setTxLimitStock(key, newTxLimitStock);
                retry = false;
                return;
              }
            }
            // It has to reset datastore data
            else {
              txCount.count = newStock;
              txCount.created_at = now;
              await transactionManager.save(txCount);
              const newTxLimitStock = {
                stock: newStock,
                counter: 0,
                isDatastoreLimit: false,
                createdAt: now,
              };
              this.txLimitStockService.setTxLimitStock(key, newTxLimitStock);
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
    const key = this.txLimitStockService.getTxLimitStockKey(
      from,
      to,
      methodId,
      rateLimit,
    );
    let txLimitStock = this.txLimitStockService.getTxLimitStock(key);

    if (
      this.txLimitStockService.isNeedTxLimitStockUpdate(txLimitStock, rateLimit)
    ) {
      await this.resetTxLimitStock(key, rateLimit);
    } else if (
      this.txLimitStockService.isSurplusStock(
        txLimitStock,
        rateLimit,
        await this.getStandardTxLimitStockAmount(rateLimit.limit),
      )
    ) {
      // todo: return surplus stock to datastore
    }
    this.txLimitStockService.consumeStock(key);
    txLimitStock = this.txLimitStockService.getTxLimitStock(key);
    return txLimitStock ? txLimitStock.stock : 0;
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
