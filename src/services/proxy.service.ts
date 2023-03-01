import { Injectable } from '@nestjs/common';
import { IncomingHttpHeaders } from 'http';
import { ConfigService } from '@nestjs/config';
import { VerseService } from './verse.service';
import { TransactionService } from './transaction.service';
import { RateLimitService } from './rateLimit.service';
import {
  JsonrpcRequestBody,
  VerseRequestResponse,
  JsonrpcError,
} from 'src/entities';

@Injectable()
export class ProxyService {
  constructor(
    private configService: ConfigService,
    private verseService: VerseService,
    private readonly txService: TransactionService,
    private readonly rateLimitService: RateLimitService,
  ) {}

  async handleSingleRequest(
    headers: IncomingHttpHeaders,
    body: JsonrpcRequestBody,
    callback: (result: VerseRequestResponse) => void,
  ) {
    const result = await this.requestVerse(headers, body);
    callback(result);
  }

  async handleBatchRequest(
    headers: IncomingHttpHeaders,
    body: Array<JsonrpcRequestBody>,
    callback: (result: VerseRequestResponse) => void,
  ) {
    const results = await Promise.all(
      body.map(async (verseRequest): Promise<any> => {
        const result = await this.requestVerse(headers, verseRequest);
        return result.data;
      }),
    );
    callback({
      status: 200,
      data: results,
    });
  }

  async requestVerse(headers: IncomingHttpHeaders, body: JsonrpcRequestBody) {
    try {
      const method = body.method;
      this.checkMethod(method);

      if (method !== 'eth_sendRawTransaction') {
        const result = await this.verseService.post(headers, body);
        return result;
      }

      return await this.executeTransaction(headers, body);
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
        return {
          status,
          data,
        };
      }
      return {
        status,
        data: err,
      };
    }
  }

  async executeTransaction(
    headers: IncomingHttpHeaders,
    body: JsonrpcRequestBody,
  ) {
    const rawTx = body.params ? body.params[0] : undefined;
    if (!rawTx) throw new JsonrpcError('rawTransaction is not found', -32602);

    const tx = this.txService.parseRawTx(rawTx);
    const from = tx.from;
    const to = tx.to;
    const methodId = tx.data.substring(0, 10);
    const value = tx.value;

    if (!from) throw new JsonrpcError('transaction is invalid', -32602);

    // Contract Deploy transaction
    if (!to) {
      this.txService.checkContractDeploy(from);
      await this.txService.checkAllowedGas(tx, body.jsonrpc, body.id);
      const result = await this.verseService.post(headers, body);
      return result;
    }

    const matchedTxAllowRule = await this.txService.getMatchedTxAllowRule(
      from,
      to,
      methodId,
      value,
    );
    await this.txService.checkAllowedGas(tx, body.jsonrpc, body.id);
    const result = await this.verseService.post(headers, body);
    const isSetRateLimit = this.configService.get<string>('isSetRateLimit');
    if (isSetRateLimit)
      await this.rateLimitService.store(from, to, methodId, matchedTxAllowRule);
    return result;
  }

  checkMethod(method: string) {
    const allowedMethods = this.configService.get<RegExp[]>(
      'allowedMethods',
    ) ?? [/^.*$/];
    const checkMethod = allowedMethods.some((allowedMethod) => {
      return allowedMethod.test(method);
    });
    if (!checkMethod)
      throw new JsonrpcError(`${method} is not allowed`, -32601);
  }
}
