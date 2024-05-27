import { Injectable, ForbiddenException } from '@nestjs/common';
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
import { WSClient } from './websocket.service';
import { DatastoreService } from 'src/repositories';

@Injectable()
export class ProxyService {
  private isUseBlockNumberCache: boolean;
  private isUseDatastore: boolean;
  private isUseReadNode: boolean;
  private allowedMethods: RegExp[];
  private wsMethods: RegExp;

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
    this.isUseDatastore = !!this.configService.get<string>('datastore');
    this.isUseReadNode = !!this.configService.get<string>('verseReadNodeUrl');
    this.allowedMethods = this.configService.get<RegExp[]>(
      'allowedMethods',
    ) ?? [/^.*$/];
    this.wsMethods =
      this.configService.get<RegExp>('wsMethods') ??
      /^eth_(subscribe|unsubscribe)$/;
  }

  async proxy(
    requestContext: RequestContext,
    body: any,
    opts?: { forceUseMasterNode?: boolean; ws?: WSClient },
  ): Promise<VerseRequestResponse> {
    const isUseReadNode =
      opts?.forceUseMasterNode === true ? false : this.isUseReadNode;

    if (this.typeCheckService.isJsonrpcRequestBody(body)) {
      return await this.handleSingleRequest(
        isUseReadNode,
        requestContext,
        body,
        opts?.ws,
      );
    }
    if (this.typeCheckService.isJsonrpcArrayRequestBody(body)) {
      return await this.handleBatchRequest(
        isUseReadNode,
        requestContext,
        body,
        opts?.ws,
      );
    }
    throw new ForbiddenException(`invalid request`);
  }

  async handleSingleRequest(
    isUseReadNode: boolean,
    requestContext: RequestContext,
    body: JsonrpcRequestBody,
    ws?: WSClient,
  ): Promise<VerseRequestResponse> {
    if (ws && this.wsMethods.test(body.method)) {
      return { status: 0, data: await ws.sendToServer(body) };
    }
    return await this.send(isUseReadNode, requestContext, body);
  }

  async handleBatchRequest(
    isUseReadNode: boolean,
    requestContext: RequestContext,
    body: Array<JsonrpcRequestBody>,
    ws?: WSClient,
  ): Promise<VerseRequestResponse> {
    const results = await Promise.all(
      body.map(async (x) => {
        const result = await this.handleSingleRequest(
          isUseReadNode,
          requestContext,
          x,
          ws,
        );
        return result.data;
      }),
    );
    return { status: 200, data: results };
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
    const txHash = result.data.result;

    if (this.isUseDatastore && matchedTxAllowRule.rateLimit) {
      await this.datastoreService.setTransactionHistory(
        tx.from,
        tx.to,
        methodId,
        txHash,
        matchedTxAllowRule.rateLimit,
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
