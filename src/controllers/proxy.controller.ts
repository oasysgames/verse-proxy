import {
  Controller,
  Post,
  Body,
  Redirect,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TransactionService } from '../services';
import { IsString, IsInt, IsArray } from 'class-validator';

class VerseRequestDto {
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
    private readonly txService: TransactionService,
  ) {}

  @Post()
  @Redirect('http://localhost:8545', 307)
  redirectVerse(@Body() verseRequest: VerseRequestDto) {
    const verseUrl = this.configService.get<string>('verseUrl');
    const method = verseRequest.method;
    const allowedMethods =
      this.configService.get<RegExp>('allowedMethods') ??
      /^eth_(get.*|sendRawTransaction)$/;
    if (!allowedMethods.test(method))
      throw new ForbiddenException('rpc method is not whitelisted');

    if (method !== 'eth_sendRawTransaction') {
      return { url: verseUrl };
    }
    const rawTx = verseRequest.params[0];
    this.txService.allowCheck(rawTx);
    return { url: verseUrl };
  }
}
