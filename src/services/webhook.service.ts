import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom, catchError, retry } from 'rxjs';
import { JsonrpcError, WebhookTransferData } from 'src/entities';
import { Webhook } from 'src/config/transactionAllowList';

@Injectable()
export class WebhookService {
  constructor(private readonly httpService: HttpService) {}

  async post(webhookArg: WebhookTransferData, webhook: Webhook): Promise<void> {
    const webhookBody = {
      ...(webhook.parse ? webhookArg.tx : webhookArg.body),
      _meta: {
        ip: webhookArg.requestContext.ip,
        headers: webhookArg.requestContext.headers,
      },
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
      if (res.status < 200 || res.status >= 300)
        throw new Error('transaction is not allowed');
    } catch (e) {
      if (e instanceof Error) {
        throw new JsonrpcError(e.message, -32602);
      }
      throw e;
    }
  }

  async checkWebhook(webhookArg: WebhookTransferData, webhooks: Webhook[]) {
    await Promise.all(
      webhooks.map(async (webhook): Promise<void> => {
        await this.post(webhookArg, webhook);
      }),
    );
  }
}
