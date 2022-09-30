import { Controller, Post, Body, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom, map } from 'rxjs';
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
    private readonly httpService: HttpService,
    private configService: ConfigService,
    private readonly txService: TransactionService,
  ) {}

  @Post()
  async redirectVerse(@Body() verseRequest: VerseRequestDto) {
    const verseUrl =
      this.configService.get<string>('verseUrl') ?? 'http://localhost:8545';
    const method = verseRequest.method;
    const allowedMethods =
      this.configService.get<RegExp>('allowedMethods') ??
      /^eth_(get.*|sendRawTransaction)$/;
    if (!allowedMethods.test(method))
      throw new ForbiddenException('rpc method is not whitelisted');

    const body = {
      jsonrpc: verseRequest.jsonrpc,
      id: verseRequest.id,
      method: verseRequest.method,
      params: verseRequest.params,
    };
    if (method !== 'eth_sendRawTransaction') {
      const data = await lastValueFrom(
        this.httpService.post(verseUrl, body).pipe(map((res) => res.data)),
      );
      return data;
    }
    const rawTx = verseRequest.params[0];
    this.txService.allowCheck(rawTx);
    const data = await lastValueFrom(
      this.httpService.post(verseUrl, body).pipe(map((res) => res.data)),
    );
    return data;
  }
}
