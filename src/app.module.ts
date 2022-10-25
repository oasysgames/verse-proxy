import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ProxyController } from './controllers';
import { ProxyService, TransactionService, VerseService } from './services';
import { SharedModule } from './shared/shared.module';
import { AllowCheckService } from './shared/services/src';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
    }),
    HttpModule,
    SharedModule,
  ],
  controllers: [ProxyController],
  providers: [
    VerseService,
    TransactionService,
    ProxyService,
    AllowCheckService,
  ],
})
export class AppModule {}
