import { Injectable, Inject, Optional } from '@nestjs/common';
import { Redis } from 'ioredis';
import { RateLimit } from 'src/config/transactionAllowList';
import { TransactionLimitStockService } from './transactionLimitStock.service';

@Injectable()
export class RedisService {
  private heartBeatKey = 'heartbeat';
  private txCountFieldNames = {
    count: 'count',
    createdAt: 'created_at',
  };
  private blockNumberFieldNames = {
    blockNumber: 'block_number',
    updatedAt: 'updated_at',
  };

  constructor(
    private txLimitStockService: TransactionLimitStockService,
    @Inject('REDIS') @Optional() private redis: Redis,
  ) {}

  async setHeartBeat(
    refreshMultiple: number,
    now: number,
    refreshTimestamp: number,
  ) {
    const pipeline = this.redis.pipeline();
    pipeline.zadd(this.heartBeatKey, now, now);
    if (now % refreshMultiple === 0) {
      pipeline.zremrangebyscore(this.heartBeatKey, 0, refreshTimestamp);
    }
    await pipeline.exec();
  }

  async getWorkerCountInInterval(start: number, end: number) {
    return await this.redis.zcount(this.heartBeatKey, start, end);
  }

  async returnSurplusTxLimitStock(
    key: string,
    rateLimit: RateLimit,
    getStandardTxLimitStockAmount: (limit: number) => Promise<number>,
  ) {
    const countFieldName = this.txCountFieldNames.count;

    const MAX_RETRIES = 5;
    let retryCount = 0;

    while (true) {
      try {
        await this.redis.watch(key);
        const redisData = await this.redis.hmget(key, countFieldName);
        const countFieldValue = redisData[0];
        const txLimitStock = this.txLimitStockService.getTxLimitStock(key);
        if (!countFieldValue || !txLimitStock) break;

        const redisCount = Number(countFieldValue);
        const standardStock = await getStandardTxLimitStockAmount(
          rateLimit.limit,
        );

        const surplusStock = this.txLimitStockService.getSurplusStockAmount(
          txLimitStock,
          standardStock,
        );

        const multiResult = await this.redis
          .multi()
          .hset(key, countFieldName, redisCount - surplusStock)
          .exec();
        if (!multiResult)
          throw new Error('Cannot set transaction rate to redis');
        txLimitStock.stock -= surplusStock;
        this.txLimitStockService.setTxLimitStock(key, txLimitStock);
        break;
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
    const countFieldName = this.txCountFieldNames.count;
    const createdAtFieldName = this.txCountFieldNames.createdAt;

    const MAX_RETRIES = 5;
    let retryCount = 0;

    while (true) {
      try {
        await this.redis.watch(key);
        const redisData = await this.redis.hmget(
          key,
          countFieldName,
          createdAtFieldName,
        );
        const countFieldValue = redisData[0];
        const createdAtFieldValue = redisData[1];
        const newStock = await getStandardTxLimitStockAmount(rateLimit.limit);
        const now = Date.now();

        // datastore value is not set
        if (!(countFieldValue && createdAtFieldValue)) {
          const multiResult = await this.redis
            .multi()
            .hset(key, countFieldName, newStock, createdAtFieldName, now)
            .exec();
          const newTxLimitStock = {
            stock: newStock,
            counter: 0,
            isDatastoreLimit: false,
            createdAt: now,
          };
          const txLimitStock = this.txLimitStockService.getTxLimitStock(key);
          if (multiResult) {
            if (
              this.txLimitStockService.isNeedTxLimitStockUpdate(
                txLimitStock,
                rateLimit,
              )
            ) {
              this.txLimitStockService.setTxLimitStock(key, newTxLimitStock);
            }
            break;
          }
          throw new Error('Cannot set transaction rate to redis');
        }

        // datastore value is set
        const redisCount = Number(countFieldValue);
        const createdAt = Number(createdAtFieldValue);
        const counterAge = now - createdAt;

        // It does not have to reset redis data
        if (rateLimitIntervalMs > counterAge) {
          if (redisCount + newStock > rateLimit.limit) {
            const newTxLimitStock = {
              stock: 0,
              counter: 0,
              isDatastoreLimit: true,
              createdAt: now,
            };
            this.txLimitStockService.setTxLimitStock(key, newTxLimitStock);
            await this.redis.unwatch();
            break;
          } else {
            const multiResult = await this.redis
              .multi()
              .hset(
                key,
                countFieldName,
                redisCount + newStock,
                createdAtFieldName,
                createdAt,
              )
              .exec();
            const newTxLimitStock = {
              stock: newStock,
              counter: 0,
              isDatastoreLimit: false,
              createdAt: now,
            };
            const txLimitStock = this.txLimitStockService.getTxLimitStock(key);
            if (multiResult) {
              if (
                this.txLimitStockService.isNeedTxLimitStockUpdate(
                  txLimitStock,
                  rateLimit,
                )
              ) {
                this.txLimitStockService.setTxLimitStock(key, newTxLimitStock);
              }
              break;
            }
            throw new Error('Cannot set transaction rate to redis');
          }
        }
        // It has to reset redis data
        else {
          const multiResult = await this.redis
            .multi()
            .hset(key, countFieldName, newStock, createdAtFieldName, now)
            .exec();
          const newTxLimitStock = {
            stock: newStock,
            counter: 0,
            isDatastoreLimit: false,
            createdAt: now,
          };
          const txLimitStock = this.txLimitStockService.getTxLimitStock(key);
          if (multiResult) {
            if (
              this.txLimitStockService.isNeedTxLimitStockUpdate(
                txLimitStock,
                rateLimit,
              )
            ) {
              this.txLimitStockService.setTxLimitStock(key, newTxLimitStock);
            }
            break;
          }
          throw new Error('Cannot set transaction rate to redis');
        }
      } catch (err) {
        if (retryCount >= MAX_RETRIES) {
          throw err;
        }
        retryCount++;
      }
    }
  }

  async getBlockNumber(key: string) {
    const blockNumberFieldName = this.blockNumberFieldNames.blockNumber;
    const updatedAtFieldName = this.blockNumberFieldNames.updatedAt;
    const blockNumberData = await this.redis.hmget(
      key,
      blockNumberFieldName,
      updatedAtFieldName,
    );
    const blockNumberFieldValue = blockNumberData[0];
    const updatedAtFieldValue = blockNumberData[1];
    if (!blockNumberFieldValue || !updatedAtFieldValue) return null;
    const updatedAt = Number(updatedAtFieldValue);

    return {
      blockNumber: blockNumberFieldValue,
      updatedAt,
    };
  }

  async setBlockNumber(key: string, blockNumber: string) {
    const blockNumberFieldName = this.blockNumberFieldNames.blockNumber;
    const updatedAtFieldName = this.blockNumberFieldNames.updatedAt;
    await this.redis.hset(
      key,
      blockNumberFieldName,
      blockNumber,
      updatedAtFieldName,
      Date.now(),
    );
  }
}
