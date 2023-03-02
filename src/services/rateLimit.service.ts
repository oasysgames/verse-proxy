import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from 'src/repositories';
import { TransactionAllow, RateLimit } from 'src/config/transactionAllowList';
import { JsonrpcError } from 'src/entities';
import { AllowCheckService } from './allowCheck.service';

@Injectable()
export class RateLimitService {
  private rateLimitPlugin: string;

  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
    private allowCheckService: AllowCheckService,
  ) {
    this.rateLimitPlugin =
      this.configService.get<string>('rateLimitPlugin') ?? '';
  }

  async setTransactionHistory(
    from: string,
    to: string,
    methodId: string,
    txHash: string,
    rateLimit: RateLimit,
  ) {
    const txHashByte = Buffer.from(txHash.slice(2), 'hex');
    const { interval } = rateLimit;

    switch (this.rateLimitPlugin) {
      case 'redis':
        const redisKey = this.getRedisKey(from, to, methodId, rateLimit);
        const now = Date.now();
        const removeDataTimestamp = this.getTimeSecondsAgo(now, interval) - 1;
        await this.redisService.setTransactionHistory(
          redisKey,
          txHashByte,
          now,
          removeDataTimestamp,
        );
        break;
    }
  }

  async store(
    from: string,
    to: string,
    methodId: string,
    txHash: string,
    matchedTxAllowRule: TransactionAllow | undefined,
  ) {
    if (!matchedTxAllowRule) return;
    const { rateLimit } = matchedTxAllowRule;
    if (!rateLimit) return;

    await this.setTransactionHistory(from, to, methodId, txHash, rateLimit);
  }

  async getTransactionHistoryCount(
    from: string,
    to: string,
    methodId: string,
    rateLimit: RateLimit,
  ) {
    let txCounter = 0;
    const { interval } = rateLimit;

    switch (this.rateLimitPlugin) {
      case 'redis':
        const redisKey = this.getRedisKey(from, to, methodId, rateLimit);
        const now = Date.now();
        const intervalAgo = this.getTimeSecondsAgo(now, interval);
        txCounter = await this.redisService.getTransactionHistoryCount(
          redisKey,
          intervalAgo,
          now,
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

  private getTimeSecondsAgo(timestamp: number, interval: number) {
    const intervalAgo = timestamp - interval * 1000;

    return intervalAgo;
  }
}
