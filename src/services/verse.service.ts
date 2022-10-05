import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom, map } from 'rxjs';
import { Request } from 'express';

interface VerseRequestBody {
  jsonrpc: string;
  id: number;
  method: string;
  params: Array<any>;
}

@Injectable()
export class VerseService {
  private verseUrl: string;
  private inheritHostHeader: boolean;
  constructor(
    private readonly httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.verseUrl =
      this.configService.get<string>('verseUrl') ?? 'http://localhost:8545';
    this.inheritHostHeader =
      this.configService.get<boolean>('inheritHostHeader') ?? false;
  }

  async post(proxyRequest: Request, body: VerseRequestBody): Promise<any> {
    const headers: Record<string, string> = {};
    for (const key in proxyRequest.headers) {
      const value = proxyRequest.headers[key];
      if (key.slice(0, 2) === 'x-' && typeof value === 'string') {
        headers[key] = value;
      }
    }
    if (this.inheritHostHeader && proxyRequest.headers['host']) {
      headers['host'] = proxyRequest.headers['host'];
    }
    const axiosConfig = { headers };

    const data = await lastValueFrom(
      this.httpService
        .post(this.verseUrl, body, axiosConfig)
        .pipe(map((res) => res.data)),
    );
    return data;
  }
}
