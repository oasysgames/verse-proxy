import { Injectable } from '@nestjs/common';
import { Transaction } from 'ethers';
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
    value: bigint,
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
    tx: Transaction,
    jsonrpc: JsonrpcVersion,
    id: JsonrpcId,
  ): Promise<void> {
    const ethCallParams: EthEstimateGasParams = {
      nonce: this.toBeHex(tx.nonce),
      gas: this.toBeHex(tx.gasLimit),
      value: this.toBeHex(tx.value),
      data: tx.data,
      chainId: this.toBeHex(tx.chainId),
    };

    if (tx.type) ethCallParams['type'] = this.toBeHex(tx.type);
    if (tx.from) ethCallParams['from'] = tx.from;
    if (tx.to) ethCallParams['to'] = tx.to;
    if (tx.gasPrice) ethCallParams['gasPrice'] = this.toBeHex(tx.gasPrice);
    if (tx.maxPriorityFeePerGas)
      ethCallParams['maxPriorityFeePerGas'] = this.toBeHex(
        tx.maxPriorityFeePerGas,
      );
    if (tx.maxFeePerGas)
      ethCallParams['maxFeePerGas'] = this.toBeHex(tx.maxFeePerGas);
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
    const blockNumberCache = await this.datastoreService.getBlockNumberCache(
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
      await this.datastoreService.setBlockNumberCache(
        requestContext,
        res.data.result,
      );
      return res;
    }
    throw new JsonrpcError('can not get blockNumber', -32603);
  }

  parseRawTx(rawTx: string): Transaction {
    return Transaction.from(rawTx);
  }

  // Avoid using `ethers.toBeHex` — it can cause parse errors.
  // Example: 0x01 -> error, but 0x1 -> valid
  //
  // Error: invalid argument 0: json: cannot unmarshal hex number
  // with leading zero digits into Go struct field
  // TransactionArgs.nonce of type hexutil.Uint64
  toBeHex(v: string | bigint | number): string {
    if (typeof v === 'bigint') return '0x' + v.toString(16);
    if (typeof v === 'number') return '0x' + v.toString(16);
    if (v.startsWith('0x')) return v; // if v is hex string
    if (!/^\d+$/.test(v)) throw new Error(`failed to convert ${v} to hex`); // assert number string
    return '0x' + BigInt(v).toString(16);
  }
}
