import { Controller, Post, Body, Redirect } from '@nestjs/common';
import { TransactionService } from '../services/transaction.service';
import { IsString, IsInt, IsArray } from 'class-validator';

class VerseRequestDto {
  @IsString({ message: 'invalid JSON-RPC version' })
  jsonrpc: string;

  @IsInt({ message: 'invalid ID' })
  id: number;

  @IsString({ message: 'rpc method is not whitelisted' })
  method: string;

  @IsArray({ message: 'expected params array of at least 1 argument' })
  params: [];
}

@Controller()
export class ProxyController {
  constructor(private readonly txService: TransactionService) {}

  @Post()
  @Redirect('https://nestjs.com', 307)
  redirectVerse(@Body() verseRequest: VerseRequestDto) {
    if (verseRequest.method !== 'eth_sendRawTransaction') {
      return { url: 'https://docs.nestjs.com/v5/' };
    }
    return {};
  }
}
