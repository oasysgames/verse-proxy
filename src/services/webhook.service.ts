import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Transaction } from 'ethers';
import { lastValueFrom, catchError, retry } from 'rxjs';
import { IncomingHttpHeaders } from 'http';
import { JsonrpcRequestBody, WebhookResponse } from 'src/entities';
import { Webhook } from 'src/config/transactionAllowList';
import { URL } from 'url';

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
    let verseHeaders: Record<string, string> = {};
    if (headers['host']) {
      verseHeaders['host'] = headers['host'];
    }
    if (headers['user-agent']) {
      verseHeaders['user-agent'] = headers['user-agent'];
    }

    if (webhook.headers) {
      verseHeaders = Object.assign(verseHeaders, webhook.headers);
    }

    const data = webhook.parse ? tx : body;

    const webhookBody = {
      request: {
        clientIp: ip,
        headers: verseHeaders,
      },
      data: data,
    };

    const webhookUrl = new URL(webhook.url);

    const axiosConfig = {
      timeout: webhook.timeout,
      headers: {
        host: webhookUrl.hostname,
      },
    };

    const res = await lastValueFrom(
      this.httpService.post(webhook.url, webhookBody, axiosConfig).pipe(
        // when response status is 400 or higher
        catchError((e) => {
          throw e;
        }),
        retry(webhook.retry),
      ),
    );
    return { status: res.status };
  }
}