import { Injectable } from '@nestjs/common';
import { ethers, BigNumber, Transaction } from 'ethers';
import {
  EthEstimateGasParams,
  JsonrpcRequestBody,
  JsonrpcId,
  JsonrpcVersion,
  JsonrpcError,
  VerseRequestResponse,
  RequestContext,
} from 'src/entities';
import {
  TransactionAllow,
  getTxAllowList,
} from 'src/config/transactionAllowList';
import { VerseService } from './verse.service';
import { AllowCheckService } from './allowCheck.service';
import { RateLimitService } from './rateLimit.service';
import { TypeCheckService } from './typeCheck.service';
import { DatastoreService } from 'src/repositories';

@Injectable()
export class TransactionService {
  private txAllowList: Array<TransactionAllow>;
  constructor(
    private typeCheckService: TypeCheckService,
    private verseService: VerseService,
    private allowCheckService: AllowCheckService,
    private readonly rateLimitService: RateLimitService,
    private readonly datastoreService: DatastoreService,
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
        if (condition.rateLimits)
          await this.rateLimitService.checkRateLimits(
            from,
            to,
            methodId,
            condition.rateLimits,
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

    const { data } = await this.verseService.postVerseMasterNode(headers, body);
    if (this.typeCheckService.isJsonrpcErrorResponse(data)) {
      const { code, message } = data.error;
      throw new JsonrpcError(message, code);
    }
  }

  async getBlockNumberCacheRes(
    requestContext: RequestContext,
    jsonrpc: JsonrpcVersion,
    id: JsonrpcId,
  ): Promise<VerseRequestResponse> {
    const blockNumberCache = await this.datastoreService.getBlockNumber(
      requestContext,
    );

    if (blockNumberCache) {
      const data = {
        id,
        jsonrpc,
        result: blockNumberCache,
      };
      return {
        status: 200,
        data,
      };
    }
    const res = await this.resetBlockNumberCache(requestContext, jsonrpc, id);
    return res;
  }

  async getLatestBlockNumber(jsonrpc: JsonrpcVersion, id: JsonrpcId) {
    const headers = {};
    const body: JsonrpcRequestBody = {
      jsonrpc: jsonrpc,
      id: id,
      method: 'eth_blockNumber',
      params: [],
    };

    const res = await this.verseService.postVerseMasterNode(headers, body);

    if (this.typeCheckService.isJsonrpcErrorResponse(res.data)) {
      const { code, message } = res.data.error;
      throw new JsonrpcError(message, code);
    }
    return res;
  }

  async resetBlockNumberCache(
    requestContext: RequestContext,
    jsonrpc: JsonrpcVersion,
    id: JsonrpcId,
  ) {
    const res = await this.getLatestBlockNumber(jsonrpc, id);

    if (this.typeCheckService.isJsonrpcBlockNumberSuccessResponse(res.data)) {
      await this.datastoreService.setBlockNumber(
        requestContext,
        res.data.result,
      );
      return res;
    }
    throw new JsonrpcError('can not get blockNumber', -32603);
  }

  parseRawTx(rawTx: string): ethers.Transaction {
    return ethers.utils.parseTransaction(rawTx);
  }
}
