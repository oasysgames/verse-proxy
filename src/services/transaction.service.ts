import { Injectable } from '@nestjs/common';
import { ethers, BigNumber, Transaction } from 'ethers';
import {
  EthEstimateGasParams,
  JsonrpcRequestBody,
  JsonrpcId,
  JsonrpcVersion,
  JsonrpcError,
  VerseRequestResponse,
} from 'src/entities';
import {
  TransactionAllow,
  getTxAllowList,
} from 'src/config/transactionAllowList';
import { VerseService } from './verse.service';
import { AllowCheckService } from './allowCheck.service';
import { RateLimitService } from './rateLimit.service';
import { TypeCheckService } from './typeCheck.service';

@Injectable()
export class TransactionService {
  private txAllowList: Array<TransactionAllow>;
  constructor(
    private typeCheckService: TypeCheckService,
    private verseService: VerseService,
    private allowCheckService: AllowCheckService,
    private readonly rateLimitService: RateLimitService,
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

      const valueCondition = condition.value;
      const valueCheck = this.allowCheckService.isAllowedValue(
        valueCondition,
        value,
      );

      if (fromCheck && toCheck && valueCheck) {
        if (condition.rateLimit)
          await this.rateLimitService.checkRateLimit(
            from,
            to,
            methodId,
            condition.rateLimit,
          );
        matchedTxAllowRule = condition;
        break;
      }
    }

    if (!matchedTxAllowRule)
      throw new JsonrpcError('transaction is not allowed', -32602);

    return matchedTxAllowRule;
  }

  async checkAllowedGas(
    isUseReadNode: boolean,
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

    let res: VerseRequestResponse;
    if (isUseReadNode) {
      res = await this.verseService.postVerseReadNode(headers, body);
    } else {
      res = await this.verseService.postVerseMasterNode(headers, body);
    }

    if (this.typeCheckService.isJsonrpcErrorResponse(res.data)) {
      const { code, message } = res.data.error;
      throw new JsonrpcError(message, code);
    }
  }

  parseRawTx(rawTx: string): ethers.Transaction {
    return ethers.utils.parseTransaction(rawTx);
  }
}
