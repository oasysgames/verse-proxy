import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from 'src/repositories';
import {
  TransactionAllow,
  getTxAllowList,
  RateLimit,
} from 'src/config/transactionAllowList';
import { JsonrpcError, TransactionHistory } from 'src/entities';
import { AllowCheckService } from './allowCheck.service';

@Injectable()
export class RateLimitService {
  private rateLimitPlugin: string;
  private txAllowList: Array<TransactionAllow>;

  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
    private allowCheckService: AllowCheckService,
  ) {
    this.rateLimitPlugin =
      this.configService.get<string>('rateLimitPlugin') ?? '';
    this.txAllowList = getTxAllowList();
  }

  async setTransactionHistory(
    from: string,
    to: string,
    methodId: string,
    rateLimit: RateLimit,
  ) {
    const timestamp = Date.now();
    const value: TransactionHistory = {
      from,
      to,
      methodId,
      timestamp,
    };
    const { interval } = rateLimit;

    switch (this.rateLimitPlugin) {
      case 'redis':
        const jsonStringValue = JSON.stringify(value);
        const redisKey = this.getRedisKey(from, to, methodId, rateLimit);
        const removeDataTimestamp = timestamp - interval * 1000 - 1;
        await this.redisService.setTransactionHistory(
          redisKey,
          jsonStringValue,
          timestamp,
          removeDataTimestamp,
        );
        break;
    }
  }

  async store(
    from: string,
    to: string,
    methodId: string,
    matchedTxAllowRule: TransactionAllow | undefined,
  ) {
    if (!matchedTxAllowRule) return;
    const { rateLimit } = matchedTxAllowRule;
    if (!rateLimit) return;

    await this.setTransactionHistory(from, to, methodId, rateLimit);
  }

  async getTransactionHistoryCount(
    from: string,
    to: string,
    methodId: string,
    rateLimit: RateLimit,
  ) {
    const { interval } = rateLimit;
    let txCounter = 0;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setSeconds(endDate.getSeconds() - interval);

    switch (this.rateLimitPlugin) {
      case 'redis':
        const redisKey = this.getRedisKey(from, to, methodId, rateLimit);
        txCounter = await this.redisService.getTransactionHistoryCount(
          redisKey,
          startDate.getTime(),
          endDate.getTime(),
        );
        break;
    }
    return txCounter;
  }

  async checkRateLimit(
    from: string,
    to: string,
    methodId: string,
    txAllow: TransactionAllow,
  ) {
    if (this.allowCheckService.isUnlimitedTxRate(from)) {
      return;
    }

    const { rateLimit } = txAllow;
    if (!rateLimit) return;

    const { interval, limit } = rateLimit;
    const txCounter = await this.getTransactionHistoryCount(
      from,
      to,
      methodId,
      rateLimit,
    );

    if (txCounter + 1 > limit)
      throw new JsonrpcError(
        `The number of allowed transacting has been exceeded. Wait ${interval} seconds before transacting.`,
        -32602,
      );
  }

  private getRedisKey(
    from: string,
    to: string,
    methodId: string,
    rateLimit: RateLimit,
  ) {
    const { name, perFrom, perTo, perMethod } = rateLimit;

    const keyArray = [];
    keyArray.push(name);
    keyArray.push(perFrom ? `${from}` : '*');
    keyArray.push(perTo ? `${to}` : '*');
    keyArray.push(perMethod ? `${methodId}` : '*');
    const key = keyArray.join(':');

    return key;
  }
}
