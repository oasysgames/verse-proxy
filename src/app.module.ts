import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProxyController } from './controllers';
import { TransactionService } from './services';
import { SharedModule } from './shared/shared.module';
import { AllowCheckService } from './shared/services/src';
import { TransactionAllowList } from './shared/entities/src';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
    }),
    SharedModule,
  ],
  controllers: [ProxyController],
  providers: [TransactionService, AllowCheckService, TransactionAllowList],
})
export class AppModule {}
