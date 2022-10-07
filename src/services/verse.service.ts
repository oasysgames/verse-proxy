import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom, map } from 'rxjs';
import { IncomingHttpHeaders } from 'http';

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

  async post(
    headers: IncomingHttpHeaders,
    body: VerseRequestBody,
  ): Promise<any> {
    const verseHeaders: Record<string, string> = {};
    for (const key in headers) {
      const value = headers[key];
      if (key.slice(0, 2) === 'x-' && typeof value === 'string') {
        verseHeaders[key] = value;
      }
    }
    if (this.inheritHostHeader && headers['host']) {
      verseHeaders['host'] = headers['host'];
    }
    const axiosConfig = { headers: verseHeaders };

    const data = await lastValueFrom(
      this.httpService
        .post(this.verseUrl, body, axiosConfig)
        .pipe(map((res) => res.data)),
    );
    return data;
  }
}
