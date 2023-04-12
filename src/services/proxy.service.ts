import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VerseService } from './verse.service';
import { TransactionService } from './transaction.service';
import {
  JsonrpcRequestBody,
  VerseRequestResponse,
  JsonrpcError,
  RequestContext,
} from 'src/entities';
import { TypeCheckService } from './typeCheck.service';
import { DatastoreService } from 'src/repositories';

@Injectable()
export class ProxyService {
  private isUseBlockNumberCache: boolean;
  private isUseDatastore: boolean;
  private allowedMethods: RegExp[];

  constructor(
    private configService: ConfigService,
    private readonly typeCheckService: TypeCheckService,
    private verseService: VerseService,
    private readonly txService: TransactionService,
    private readonly datastoreService: DatastoreService,
  ) {
    this.isUseBlockNumberCache = !!this.configService.get<number>(
      'blockNumberCacheExpire',
    );
    this.isUseDatastore =
      this.configService.get<boolean>('isUseDatastore') ?? false;
    this.allowedMethods = this.configService.get<RegExp[]>(
      'allowedMethods',
    ) ?? [/^.*$/];
  }

  async handleSingleRequest(
    isUseReadNode: boolean,
    requestContext: RequestContext,
    body: JsonrpcRequestBody,
    callback: (result: VerseRequestResponse) => void,
  ) {
    const result = await this.send(isUseReadNode, requestContext, body);
    callback(result);
  }

  async handleBatchRequest(
    isUseReadNode: boolean,
    requestContext: RequestContext,
    body: Array<JsonrpcRequestBody>,
    callback: (result: VerseRequestResponse) => void,
  ) {
    const results = await Promise.all(
      body.map(async (verseRequest): Promise<any> => {
        const result = await this.send(
          isUseReadNode,
          requestContext,
          verseRequest,
        );
        return result.data;
      }),
    );
    callback({
      status: 200,
      data: results,
    });
  }

  async send(
    isUseReadNode: boolean,
    requestContext: RequestContext,
    body: JsonrpcRequestBody,
  ) {
    try {
      const method = body.method;
      const { headers } = requestContext;
      this.checkMethod(method);

      const isMetamaskAccess =
        headers.origin ===
          'chrome-extension://nkbihfbeogaeaoehlefnkodbefgpgknn' || // https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn?hl=en
        headers.origin ===
          'chrome-extension://ejbalbakoplchlghecdalmeeeajnimhm'; // https://microsoftedge.microsoft.com/addons/detail/metamask/ejbalbakoplchlghecdalmeeeajnimhm

      if (method === 'eth_sendRawTransaction') {
        return await this.sendTransaction(requestContext, body);
      } else if (method === 'eth_estimateGas') {
        return await this.verseService.postVerseMasterNode(headers, body);
      } else if (
        method === 'eth_blockNumber' &&
        this.isUseBlockNumberCache &&
        isMetamaskAccess
      ) {
        return await this.txService.getBlockNumberCacheRes(
          requestContext,
          body.jsonrpc,
          body.id,
        );
      }

      if (isUseReadNode) {
        return await this.verseService.postVerseReadNode(headers, body);
      } else {
        return await this.verseService.postVerseMasterNode(headers, body);
      }
    } catch (err) {
      const status = 200;
      if (err instanceof JsonrpcError) {
        const data = {
          jsonrpc: body.jsonrpc,
          id: body.id,
          error: {
            code: err.code,
            message: err.message,
          },
        };
        console.error(err.message);
        return {
          status,
          data,
        };
      }
      console.error(err);
      return {
        status,
        data: err,
      };
    }
  }

  async sendTransaction(
    requestContext: RequestContext,
    body: JsonrpcRequestBody,
  ) {
    const rawTx = body.params ? body.params[0] : undefined;
    if (!rawTx) throw new JsonrpcError('rawTransaction is not found', -32602);

    const tx = this.txService.parseRawTx(rawTx);

    if (!tx.from) throw new JsonrpcError('transaction is invalid', -32602);

    // contract deploy transaction
    if (!tx.to) {
      this.txService.checkContractDeploy(tx.from);
      await this.txService.checkAllowedGas(tx, body.jsonrpc, body.id);
      const result = await this.verseService.postVerseMasterNode(
        requestContext.headers,
        body,
      );
      return result;
    }

    // transaction other than contract deploy
    const methodId = tx.data.substring(0, 10);
    const matchedTxAllowRule = await this.txService.getMatchedTxAllowRule(
      tx.from,
      tx.to,
      methodId,
      tx.value,
    );
    await this.txService.checkAllowedGas(tx, body.jsonrpc, body.id);
    const result = await this.verseService.postVerseMasterNode(
      requestContext.headers,
      body,
    );

    if (!this.typeCheckService.isJsonrpcTxSuccessResponse(result.data))
      return result;

    if (this.isUseDatastore && matchedTxAllowRule.rateLimits) {
      await this.datastoreService.reduceTxCount(
        tx.from,
        tx.to,
        methodId,
        matchedTxAllowRule.rateLimits,
      );
    }
    if (this.isUseDatastore && this.isUseBlockNumberCache) {
      await this.txService.resetBlockNumberCache(
        requestContext,
        body.jsonrpc,
        body.id,
      );
    }
    return result;
  }

  checkMethod(method: string) {
    const checkMethod = this.allowedMethods.some((allowedMethod) => {
      return allowedMethod.test(method);
    });
    if (!checkMethod)
      throw new JsonrpcError(`${method} is not allowed`, -32601);
  }
}
