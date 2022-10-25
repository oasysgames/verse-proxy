import { Injectable, ForbiddenException } from '@nestjs/common';
import { IncomingHttpHeaders } from 'http';
import { ConfigService } from '@nestjs/config';
import { VerseService } from './verse.service';
import { TransactionService } from './transaction.service';
import { JsonrpcRequestBody, VerseRequestResponse } from 'src/shared/entities';

@Injectable()
export class ProxyService {
  constructor(
    private configService: ConfigService,
    private verseService: VerseService,
    private readonly txService: TransactionService,
  ) {}

  async handleSingleRequest(
    headers: IncomingHttpHeaders,
    body: JsonrpcRequestBody,
    callback: (result: VerseRequestResponse) => void,
  ) {
    const method = body.method;
    this.checkMethod(method);

    if (method !== 'eth_sendRawTransaction') {
      const result = await this.verseService.post(headers, body);
      callback(result);
      return;
    }

    const rawTx = body.params[0];
    const tx = this.txService.parseRawTx(rawTx);
    this.txService.checkAllowedTx(tx);
    await this.txService.checkAllowedGas(tx, body.jsonrpc, body.id);
    const result = await this.verseService.post(headers, body);
    callback(result);
  }

  async handleBatchRequest(
    headers: IncomingHttpHeaders,
    body: Array<JsonrpcRequestBody>,
    callback: (result: VerseRequestResponse) => void,
  ) {
    const result = await this.verseService.post(headers, body);
    callback(result);
  }

  checkMethod(method: string) {
    const allowedMethods = this.configService.get<RegExp[]>(
      'allowedMethods',
    ) ?? [/^.*$/];
    const checkMethod = allowedMethods.some((allowedMethod) => {
      return allowedMethod.test(method);
    });
    if (!checkMethod) throw new ForbiddenException(`${method} is not allowed`);
  }
}
