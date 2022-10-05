import {
  Controller,
  Post,
  Req,
  Body,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom, map } from 'rxjs';
import { Request } from 'express';
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
  async redirectVerse(
    @Req() request: Request,
    @Body() verseRequest: VerseRequestDto,
  ) {
    const verseUrl =
      this.configService.get<string>('verseUrl') ?? 'http://localhost:8545';
    const inheritHostHeader =
      this.configService.get<boolean>('inheritHostHeader') ?? false;
    const method = verseRequest.method;

    this.checkMethod(method);

    const headers: Record<string, string> = {};
    for (const key in request.headers) {
      const value = request.headers[key];
      if (key.slice(0, 2) === 'x-' && typeof value === 'string') {
        headers[key] = value;
      }
    }
    if (inheritHostHeader && request.headers['host']) {
      headers['host'] = request.headers['host'];
    }
    const axiosConfig = { headers };
    const body = {
      jsonrpc: verseRequest.jsonrpc,
      id: verseRequest.id,
      method: verseRequest.method,
      params: verseRequest.params,
    };
    if (method !== 'eth_sendRawTransaction') {
      const data = await lastValueFrom(
        this.httpService
          .post(verseUrl, body, axiosConfig)
          .pipe(map((res) => res.data)),
      );
      return data;
    }
    const rawTx = verseRequest.params[0];
    this.txService.checkAllowedRawTx(rawTx);
    await this.txService.checkAllowedGasFromRawTx(
      rawTx,
      verseRequest.jsonrpc,
      verseRequest.id,
    );
    const data = await lastValueFrom(
      this.httpService
        .post(verseUrl, body, axiosConfig)
        .pipe(map((res) => res.data)),
    );
    return data;
  }

  private checkMethod(method: string) {
    const allowedMethods = this.configService.get<RegExp[]>(
      'allowedMethods',
    ) ?? [/^.*$/];
    const checkMethod = allowedMethods.some((allowedMethod) => {
      return allowedMethod.test(method);
    });
    if (!checkMethod)
      throw new ForbiddenException('rpc method is not whitelisted');
  }
}
