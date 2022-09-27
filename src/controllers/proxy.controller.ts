import { Controller, Post, Body } from '@nestjs/common';
import { AppService } from '../services/app.service';
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
  constructor(private readonly appService: AppService) {}

  @Post()
  redirectVerse(@Body() verseRequestDto: VerseRequestDto) {
    return {};
  }
}
