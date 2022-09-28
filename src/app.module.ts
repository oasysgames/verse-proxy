import { Module } from '@nestjs/common';
import { ProxyController } from './controllers';
import { TransactionService } from './services';
import { SharedModule } from './shared/shared.module';
import { AllowCheckService } from './shared/services/src';
import { TransactionAllowList } from './shared/entities/src';

@Module({
  imports: [SharedModule],
  controllers: [ProxyController],
  providers: [TransactionService, AllowCheckService, TransactionAllowList],
})
export class AppModule {}
