import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ProxyController } from './controllers';
import {
  ProxyService,
  TransactionService,
  VerseService,
  AllowCheckService,
  JsonrpcCheckService,
} from './services';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
    }),
    HttpModule,
  ],
  controllers: [ProxyController],
  providers: [
    VerseService,
    TransactionService,
    ProxyService,
    AllowCheckService,
    JsonrpcCheckService,
  ],
})
export class AppModule {}
