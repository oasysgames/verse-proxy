import { Injectable } from '@nestjs/common';
import { DatastoreService } from 'src/repositories';
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

    const txCounter = await this.datastoreService.getTransactionHistoryCount(
      from,
      to,
      methodId,
      rateLimit,
    );

    if (txCounter + 1 > rateLimit.limit)
      throw new JsonrpcError(
        `The number of allowed transacting has been exceeded. Wait ${rateLimit.interval} seconds before transacting.`,
        -32602,
      );
  }
}
