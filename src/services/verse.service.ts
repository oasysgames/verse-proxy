import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom, catchError } from 'rxjs';
import { IncomingHttpHeaders } from 'http';
import { JsonrpcRequestBody, VerseRequestResponse } from 'src/entities';

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
    body: JsonrpcRequestBody | Array<JsonrpcRequestBody>,
  ): Promise<VerseRequestResponse> {
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

    const res = await lastValueFrom(
      this.httpService.post(this.verseUrl, body, axiosConfig).pipe(
        // when response status is 400 or higher
        catchError((e) => {
          throw e;
        }),
      ),
    );
    return {
      status: res.status,
      data: res.data,
    };
  }
}
