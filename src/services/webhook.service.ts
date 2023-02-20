import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Transaction } from 'ethers';
import { lastValueFrom, catchError, retry } from 'rxjs';
import { IncomingHttpHeaders } from 'http';
import { JsonrpcRequestBody, WebhookResponse } from 'src/entities';
import { Webhook } from 'src/config/transactionAllowList';

@Injectable()
export class WebhookService {
  constructor(private readonly httpService: HttpService) {}

  async post(
    ip: string,
    headers: IncomingHttpHeaders,
    body: JsonrpcRequestBody,
    tx: Transaction,
    webhook: Webhook,
  ): Promise<WebhookResponse> {
    const verseHeaders: Record<string, string> = {};

    if (headers['host']) {
      verseHeaders['host'] = headers['host'];
    }
    if (headers['user-agent']) {
      verseHeaders['user-agent'] = headers['user-agent'];
    }

    const webhookBody = {
      ...(webhook.parse ? tx : body),
      _meta: { ip, headers: verseHeaders },
    };

    const axiosConfig = {
      timeout: webhook.timeout,
      headers: webhook.headers,
    };

    try {
      const res = await lastValueFrom(
        this.httpService.post(webhook.url, webhookBody, axiosConfig).pipe(
          retry(webhook.retry),
          catchError((e) => {
            throw e;
          }),
        ),
      );
      return { status: res.status };
    } catch (e) {
      if (e instanceof Error) {
        console.error(e.message);
        return {
          status: 400,
          error: e.message,
        };
      }
      console.error(e);
      return {
        status: 400,
        error: e,
      };
    }
  }
}
