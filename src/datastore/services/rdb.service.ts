import { Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Between } from 'typeorm';
import { RateLimit } from 'src/config/transactionAllowList';
import {
  TransactionCount,
  BlockNumberCache,
  Heartbeat,
} from 'src/datastore/entities';
import { TransactionLimitStockService } from './transactionLimitStock.service';

@Injectable()
export class RdbService {
  constructor(
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
  ) {}

  async setHeartBeat(
    refreshMultiple: number,
    now: number,
    refreshTimestamp: number,
  ) {
    const entity = new Heartbeat();
    entity.created_at = now;
    await this.heartbeatRepository.save(entity);
    if (now % refreshMultiple === 0) {
      await this.heartbeatRepository.delete({
        created_at: LessThan(now - refreshTimestamp),
      });
    }
  }

  async getWorkerCountInInterval(start: number, end: number) {
    return await this.heartbeatRepository.count({
      where: {
        created_at: Between(start, end),
      },
    });
  }

  async returnSurplusTxLimitStock(
    key: string,
    rateLimit: RateLimit,
    getStandardTxLimitStockAmount: (limit: number) => Promise<number>,
  ) {
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
              !this.txLimitStockService.isSurplusStock(
                txLimitStock,
                rateLimit,
                await getStandardTxLimitStockAmount(rateLimit.limit),
              )
            ) {
              retry = false;
              return;
            }

            const txCount = await transactionManager.findOneBy(
              TransactionCount,
              {
                name: key,
              },
            );
            if (!txLimitStock || !txCount) {
              retry = false;
              return;
            }

            const standardStock = await getStandardTxLimitStockAmount(
              rateLimit.limit,
            );
            const surplusStock = this.txLimitStockService.getSurplusStockAmount(
              txLimitStock,
              standardStock,
            );

            txCount.count -= surplusStock;
            await transactionManager.save(txCount);
            txLimitStock.stock -= surplusStock;
            this.txLimitStockService.setTxLimitStock(key, txLimitStock);
            retry = false;
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

  async resetTxLimitStock(
    key: string,
    rateLimit: RateLimit,
    getStandardTxLimitStockAmount: (limit: number) => Promise<number>,
  ) {
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

            const newStock = await getStandardTxLimitStockAmount(
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

  async getBlockNumber(key: string) {
    const blockNumber = await this.bnCacheRepository.findOneBy({ name: key });

    if (!blockNumber) return null;

    return {
      blockNumber: blockNumber.value,
      updatedAt: blockNumber.updated_at,
    };
  }

  async setBlockNumber(key: string, blockNumber: string) {
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
  }
}
