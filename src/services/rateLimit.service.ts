import { Injectable } from '@nestjs/common';
import { DatastoreService } from 'src/datastore/services';
import { RateLimit } from 'src/config/transactionAllowList';
import { JsonrpcError } from 'src/entities';
import { AllowCheckService } from './allowCheck.service';

@Injectable()
export class RateLimitService {
  constructor(
    private datastoreService: DatastoreService,
    private allowCheckService: AllowCheckService,
  ) {}

  async checkRateLimit(
    from: string,
    to: string,
    methodId: string,
    rateLimit: RateLimit,
  ) {
    if (this.allowCheckService.isUnlimitedTxRate(from)) {
      return;
    }

    const txCounter = await this.datastoreService.getAllowedTxCount(
      from,
      to,
      methodId,
      rateLimit,
    );

    if (txCounter < 0)
      throw new JsonrpcError(
        `The number of allowed transacting has been exceeded. Wait ${rateLimit.interval} seconds before transacting.`,
        -32602,
      );
  }

  async checkRateLimits(
    from: string,
    to: string,
    methodId: string,
    rateLimits: RateLimit[],
  ) {
    await Promise.all(
      rateLimits.map(async (rateLimit): Promise<void> => {
        await this.checkRateLimit(from, to, methodId, rateLimit);
      }),
    );
  }
}
