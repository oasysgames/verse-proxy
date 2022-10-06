import {
  Controller,
  Post,
  Req,
  Body,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { TransactionService, VerseService } from '../services';
import { IsString, IsInt, IsArray } from 'class-validator';

class RequestBody {
  @IsString({ message: 'invalid JSON-RPC version' })
  jsonrpc: string;

  @IsInt({ message: 'invalid ID' })
  id: number;

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
  async requestVerse(@Req() request: Request, @Body() body: RequestBody) {
    const method = body.method;
    this.checkMethod(method);

    if (method !== 'eth_sendRawTransaction') {
      const data = await this.verseService.post(request, body);
      return data;
    }

    const rawTx = body.params[0];
    const tx = this.txService.parseRawTx(rawTx);
    this.txService.checkAllowedTx(tx);
    await this.txService.checkAllowedGas(tx, body.jsonrpc, body.id);
    const data = await this.verseService.post(request, body);
    return data;
  }

  private checkMethod(method: string) {
    const allowedMethods = this.configService.get<RegExp[]>(
      'allowedMethods',
    ) ?? [/^.*$/];
    const checkMethod = allowedMethods.some((allowedMethod) => {
      return allowedMethod.test(method);
    });
    if (!checkMethod) throw new ForbiddenException(`${method} is not allowed`);
  }
}
