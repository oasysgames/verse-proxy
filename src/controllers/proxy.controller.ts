import {
  Controller,
  Post,
  Headers,
  Body,
  ForbiddenException,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IncomingHttpHeaders } from 'http';
import { Response } from 'express';
import { IsString, IsArray, Validate } from 'class-validator';
import { TransactionService, VerseService } from '../services';
import { StringOrNumber } from './customValidation';

class RequestBody {
  @IsString({ message: 'invalid JSON-RPC version' })
  jsonrpc: string;

  @Validate(StringOrNumber, { message: 'invalid ID' })
  id: string | number;

  @IsString({ message: 'rpc method is not string' })
  method: string;

  @IsArray({ message: 'expected params array of at least 1 argument' })
  params: Array<any>;
}

@Controller()
export class ProxyController {
  constructor(
    private configService: ConfigService,
    private verseService: VerseService,
    private readonly txService: TransactionService,
  ) {}

  @Post()
  async requestVerse(
    @Headers() headers: IncomingHttpHeaders,
    @Body() body: RequestBody,
    @Res() res: Response,
  ) {
    const method = body.method;
    this.checkMethod(method);

    if (method !== 'eth_sendRawTransaction') {
      const { status, data } = await this.verseService.post(headers, body);
      res.status(status).send(data);
      return;
    }

    const rawTx = body.params[0];
    const tx = this.txService.parseRawTx(rawTx);
    this.txService.checkAllowedTx(tx);
    await this.txService.checkAllowedGas(tx, body.jsonrpc, body.id);
    const { status, data } = await this.verseService.post(headers, body);
    res.status(status).send(data);
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
