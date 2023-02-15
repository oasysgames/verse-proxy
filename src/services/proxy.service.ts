import { Injectable } from '@nestjs/common';
import { IncomingHttpHeaders } from 'http';
import { ConfigService } from '@nestjs/config';
import { VerseService } from './verse.service';
import { TransactionService } from './transaction.service';
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
  ) {}

  async handleSingleRequest(
    ip: string,
    headers: IncomingHttpHeaders,
    body: JsonrpcRequestBody,
    callback: (result: VerseRequestResponse) => void,
  ) {
    const result = await this.requestVerse(ip, headers, body);
    callback(result);
  }

  async handleBatchRequest(
    ip: string,
    headers: IncomingHttpHeaders,
    body: Array<JsonrpcRequestBody>,
    callback: (result: VerseRequestResponse) => void,
  ) {
    const results = await Promise.all(
      body.map(async (verseRequest): Promise<any> => {
        const result = await this.requestVerse(ip, headers, verseRequest);
        return result.data;
      }),
    );
    callback({
      status: 200,
      data: results,
    });
  }

  async requestVerse(
    ip: string,
    headers: IncomingHttpHeaders,
    body: JsonrpcRequestBody,
  ) {
    try {
      const method = body.method;
      this.checkMethod(method);

      if (method !== 'eth_sendRawTransaction') {
        const result = await this.verseService.post(headers, body);
        return result;
      }

      const rawTx = body.params ? body.params[0] : undefined;
      if (!rawTx) throw new JsonrpcError('rawTransaction is not found', -32602);

      const tx = this.txService.parseRawTx(rawTx);
      this.txService.checkAllowedTx(ip, headers, body, tx);
      await this.txService.checkAllowedGas(tx, body.jsonrpc, body.id);
      const result = await this.verseService.post(headers, body);
      return result;
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
