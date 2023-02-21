import { Injectable } from '@nestjs/common';
import { ethers, BigNumber, Transaction } from 'ethers';
import { IncomingHttpHeaders } from 'http';
import {
  EthEstimateGasParams,
  JsonrpcRequestBody,
  JsonrpcId,
  JsonrpcVersion,
  JsonrpcError,
} from 'src/entities';
import {
  TransactionAllow,
  getTxAllowList,
  AddressRestriction,
  getDeployAllowList,
} from 'src/config/transactionAllowList';
import { VerseService } from './verse.service';
import { AllowCheckService } from './allowCheck.service';
import { WebhookService } from './webhook.service';

@Injectable()
export class TransactionService {
  private txAllowList: Array<TransactionAllow>;
  private deployAllowList: AddressRestriction;
  constructor(
    private verseService: VerseService,
    private allowCheckService: AllowCheckService,
    private webhookService: WebhookService,
  ) {
    this.txAllowList = getTxAllowList();
    this.deployAllowList = getDeployAllowList();
  }

  async checkAllowedTx(
    ip: string,
    headers: IncomingHttpHeaders,
    body: JsonrpcRequestBody,
    tx: Transaction,
  ): Promise<void> {
    const from = tx.from;
    const to = tx.to;
    const value = tx.value;
    const methodId = tx.data.substring(0, 10);

    if (!from) throw new JsonrpcError('transaction is invalid', -32602);

    // Check for deploy transactions
    if (!to) {
      if (this.allowCheckService.isAllowedAddress(this.deployAllowList, from)) {
        return;
      } else {
        throw new JsonrpcError('deploy transaction is not allowed', -32602);
      }
    }

    // Check for transactions other than deploy
    let isAllow = false;
    for (const condition of this.txAllowList) {
      const fromCheck = this.allowCheckService.isAllowedAddress(
        condition.fromList,
        from,
      );
      const toCheck = this.allowCheckService.isAllowedAddress(
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

      let webhookCheck = true;
      if (condition.webhooks) {
        await Promise.all(
          condition.webhooks.map(async (webhook): Promise<void> => {
            const { status } = await this.webhookService.post(
              ip,
              headers,
              body,
              tx,
              webhook,
            );
            if (status >= 400) {
              webhookCheck = false;
            }
          }),
        );
      }

      if (fromCheck && toCheck && contractCheck && valueCheck && webhookCheck) {
        isAllow = true;
        break;
      }
    }

    if (!isAllow) throw new JsonrpcError('transaction is not allowed', -32602);
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
