import { Injectable } from '@nestjs/common';
import { Transaction } from 'ethers';
import { ConfigService } from '@nestjs/config';
import { RedisService } from 'src/repositories';
import {
  RateLimitRule,
  getRateLimitRules,
  getUnlimitedTxRateAddresses,
  getDeployAllowList,
} from 'src/config/transactionAllowList';
import { JsonrpcError, TransactionHistory } from 'src/entities';

@Injectable()
export class RateLimitService {
  private rateLimitPlugin: string;
  private rateLimitRules: Array<RateLimitRule>;
  private unlimitedTxRateAddresses: Array<string>;
  private deployAllowList: Array<string>;

  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
  ) {
    this.rateLimitPlugin =
      this.configService.get<string>('rateLimitPlugin') ?? '';
    this.rateLimitRules = getRateLimitRules();
    this.unlimitedTxRateAddresses = getUnlimitedTxRateAddresses();
    this.deployAllowList = getDeployAllowList();
  }

  async store(tx: Transaction) {
    const from = tx.from;
    const to = tx.to;
    const methodId = tx.data.substring(0, 10);
    const timestamp = Date.now();
    const value: TransactionHistory = {
      from,
      to,
      methodId,
      timestamp,
    };

    switch (this.rateLimitPlugin) {
      case 'redis':
        const jsonStringValue = JSON.stringify(value);
        await this.redisService.setTransactionHistory(
          jsonStringValue,
          timestamp,
        );
        break;
    }
  }

  async getTransactionHistory(interval: number) {
    const transactionHistory: TransactionHistory[] = [];
    const endDate = new Date();
    const startDate = new Date();
    startDate.setSeconds(endDate.getSeconds() - interval);

    switch (this.rateLimitPlugin) {
      case 'redis':
        const history = await this.redisService.getTransactionHistory(
          startDate.getTime(),
          endDate.getTime(),
        );
        history.forEach((stringTxData) => {
          const txData = JSON.parse(stringTxData) as TransactionHistory; // todo: don't use type assertion.
          transactionHistory.push(txData);
        });
        break;
    }
    return transactionHistory;
  }

  async checkRateLimit(tx: Transaction, rateLimitRule: RateLimitRule) {
    const txFrom = tx.from;
    const txTo = tx.to;
    const txMethodId = tx.data.substring(0, 10);

    const { fromList, toList, rateLimit } = rateLimitRule;
    const { perFrom, perTo, perMethod, interval, limit } = rateLimit;

    // only method check is not allowed
    if (!perFrom && !perTo && perMethod) {
      throw new JsonrpcError(
        'can not set rate limit with only method.',
        -32603,
      );
    }

    const txHistory = await this.getTransactionHistory(interval);
    let txCounter = 1;

    if (perFrom && !perTo && !perMethod) {
      txCounter += txHistory.filter(
        (historyData) =>
          this.perFromCondition(historyData, txFrom) &&
          this.nonPerToCondition(historyData, toList),
      ).length;
    } else if (!perFrom && perTo && !perMethod) {
      txCounter += txHistory.filter(
        (historyData) =>
          this.nonPerFromCondition(historyData, fromList) &&
          this.perToCondition(historyData, txTo),
      ).length;
    } else if (perFrom && perTo && !perMethod) {
      txCounter += txHistory.filter(
        (historyData) =>
          this.perFromCondition(historyData, txFrom) &&
          this.perToCondition(historyData, txTo),
      ).length;
    } else if (perFrom && !perTo && perMethod) {
      txCounter += txHistory.filter(
        (historyData) =>
          this.perFromCondition(historyData, txFrom) &&
          this.nonPerToCondition(historyData, toList) &&
          this.perMethodCondition(historyData, txMethodId),
      ).length;
    } else if (!perFrom && perTo && perMethod) {
      txCounter += txHistory.filter(
        (historyData) =>
          this.nonPerFromCondition(historyData, fromList) &&
          this.perToCondition(historyData, txTo) &&
          this.perMethodCondition(historyData, txMethodId),
      ).length;
    } else if (perFrom && perTo && perMethod) {
      txCounter += txHistory.filter(
        (historyData) =>
          this.perFromCondition(historyData, txFrom) &&
          this.perToCondition(historyData, txTo) &&
          this.perMethodCondition(historyData, txMethodId),
      ).length;
    } else if (!perFrom && !perTo && !perMethod) {
      txCounter += txHistory.filter(
        (historyData) =>
          this.nonPerFromCondition(historyData, fromList) &&
          this.nonPerToCondition(historyData, toList),
      ).length;
    }

    if (txCounter > limit)
      throw new JsonrpcError(
        `The number of allowed transacting has been exceeded. Wait ${interval} seconds before transacting.`,
        -32602,
      );
  }

  async checkRateLimits(tx: Transaction) {
    const txFrom = tx.from;
    const txTo = tx.to;

    if (!txFrom) throw new JsonrpcError('transaction is invalid', -32602);

    if (
      this.checkAddressList(this.unlimitedTxRateAddresses, txFrom) ||
      this.checkAddressList(this.deployAllowList, txFrom)
    ) {
      return;
    }

    if (!txTo)
      throw new JsonrpcError('deploy transaction is not allowed', -32602);

    await Promise.all(
      this.rateLimitRules.map(async (rateLimitRule) => {
        const { fromList, toList } = rateLimitRule;

        const isMatchRateLimitCheck =
          (fromList.includes('*') || this.checkAddressList(fromList, txFrom)) &&
          (toList.includes('*') || this.checkAddressList(toList, txTo));

        if (!isMatchRateLimitCheck) return;

        await this.checkRateLimit(tx, rateLimitRule);
      }),
    );
  }

  // todo: integrate to allowCheck.service logic
  private checkAddressList(addressList: Array<string>, input: string) {
    const isAllow = addressList.some((allowedAddress) => {
      return allowedAddress.toLowerCase() === input.toLowerCase();
    });
    return isAllow;
  }

  private perFromCondition(
    historyData: TransactionHistory,
    txFrom: string | undefined,
  ) {
    return historyData.from === txFrom;
  }

  private nonPerFromCondition(
    historyData: TransactionHistory,
    fromList: Array<string>,
  ) {
    return (
      fromList.includes('*') ||
      (historyData.from && this.checkAddressList(fromList, historyData.from))
    );
  }

  private perToCondition(
    historyData: TransactionHistory,
    txTo: string | undefined,
  ) {
    return historyData.to === txTo;
  }

  private nonPerToCondition(
    historyData: TransactionHistory,
    toList: Array<string>,
  ) {
    return (
      toList.includes('*') ||
      (historyData.to && this.checkAddressList(toList, historyData.to))
    );
  }

  private perMethodCondition(
    historyData: TransactionHistory,
    txMethodId: string,
  ) {
    return historyData.methodId === txMethodId;
  }
}
