import { Injectable } from '@nestjs/common';
import { ethers, BigNumber, Transaction } from 'ethers';
import {
  EthEstimateGasParams,
  JsonrpcRequestBody,
  JsonrpcId,
  JsonrpcVersion,
  JsonrpcError,
  WebhookTransferData,
} from 'src/entities';
import {
  TransactionAllow,
  getTxAllowList,
} from 'src/config/transactionAllowList';
import { VerseService } from './verse.service';
import { AllowCheckService } from './allowCheck.service';
import { RateLimitService } from './rateLimit.service';
import { WebhookService } from './webhook.service';

@Injectable()
export class TransactionService {
  private txAllowList: Array<TransactionAllow>;
  constructor(
    private verseService: VerseService,
    private allowCheckService: AllowCheckService,
    private readonly rateLimitService: RateLimitService,
    private readonly webhookService: WebhookService,
  ) {
    this.txAllowList = getTxAllowList();
    this.txAllowList.forEach((txAllow) => {
      this.allowCheckService.checkAddressList(txAllow.fromList);
      this.allowCheckService.checkAddressList(txAllow.toList);
    });
  }

  checkContractDeploy(from: string) {
    if (this.allowCheckService.isAllowedDeploy(from)) {
      return;
    } else {
      throw new JsonrpcError('deploy transaction is not allowed', -32602);
    }
  }

  async getMatchedTxAllowRule(
    from: string,
    to: string,
    methodId: string,
    value: BigNumber,
    webhookArg: WebhookTransferData,
  ): Promise<TransactionAllow> {
    let matchedTxAllowRule;

    for (const condition of this.txAllowList) {
      const fromCheck = this.allowCheckService.isIncludedAddress(
        condition.fromList,
        from,
      );
      const toCheck = this.allowCheckService.isIncludedAddress(
        condition.toList,
        to,
      );

      const contractCheck = this.allowCheckService.isAllowedContractMethod(
        condition.contractMethodList,
        methodId,
      );

      const valueCondition = condition.value;
      const valueCheck = this.allowCheckService.isAllowedValue(
        valueCondition,
        value,
      );

      if (fromCheck && toCheck && contractCheck && valueCheck) {
        if (condition.rateLimit)
          await this.rateLimitService.checkRateLimit(
            from,
            to,
            methodId,
            condition.rateLimit,
          );
        if (condition.webhooks) {
          await this.webhookService.checkWebhook(
            webhookArg,
            condition.webhooks,
          );
        }
        matchedTxAllowRule = condition;
        break;
      }
    }

    if (!matchedTxAllowRule)
      throw new JsonrpcError('transaction is not allowed', -32602);

    return matchedTxAllowRule;
  }

  async checkAllowedGas(
    tx: Transaction,
    jsonrpc: JsonrpcVersion,
    id: JsonrpcId,
  ): Promise<void> {
    const ethCallParams: EthEstimateGasParams = {
      nonce: ethers.utils.hexValue(BigNumber.from(tx.nonce)),
      gas: ethers.utils.hexValue(tx.gasLimit),
      value: ethers.utils.hexValue(tx.value),
      data: tx.data,
      chainId: ethers.utils.hexValue(BigNumber.from(tx.chainId)),
    };

    if (tx.type)
      ethCallParams['type'] = ethers.utils.hexValue(BigNumber.from(tx.type));
    if (tx.from) ethCallParams['from'] = tx.from;
    if (tx.to) ethCallParams['to'] = tx.to;
    if (tx.gasPrice)
      ethCallParams['gasPrice'] = ethers.utils.hexValue(tx.gasPrice);
    if (tx.maxPriorityFeePerGas)
      ethCallParams['maxPriorityFeePerGas'] = ethers.utils.hexValue(
        tx.maxPriorityFeePerGas,
      );
    if (tx.maxFeePerGas)
      ethCallParams['maxFeePerGas'] = ethers.utils.hexValue(tx.maxFeePerGas);
    if (tx.accessList) ethCallParams['accessList'] = tx.accessList;

    const params = [ethCallParams];
    const headers = {};
    const body: JsonrpcRequestBody = {
      jsonrpc: jsonrpc,
      id: id,
      method: 'eth_estimateGas',
      params: params,
    };

    const { data } = await this.verseService.post(headers, body);
    if (data.error) {
      throw new JsonrpcError(data.error.message, -32602);
    }
  }

  parseRawTx(rawTx: string): ethers.Transaction {
    return ethers.utils.parseTransaction(rawTx);
  }
}
