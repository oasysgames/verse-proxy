import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ProxyController } from './controllers';
import {
  ProxyService,
  TransactionService,
  VerseService,
  AllowCheckService,
  TypeCheckService,
  RateLimitService,
} from './services';
import { DatastoreModule } from './datastore/datastore.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
    }),
    HttpModule,
    DatastoreModule.register(),
  ],
  controllers: [ProxyController],
  providers: [
    VerseService,
    TransactionService,
    ProxyService,
    AllowCheckService,
    TypeCheckService,
    RateLimitService,
  ],
})
export class AppModule {}
