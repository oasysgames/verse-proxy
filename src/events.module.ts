import { CacheModule, Module } from '@nestjs/common';
import { CommunicateGateway } from './communicates/communicate.gateway';
import {
  AllowCheckService,
  ProxyService,
  RateLimitService,
  TransactionService,
  TypeCheckService,
  VerseService,
} from './services';
import { CommunicateService } from './communicates/communicate.service';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import configuration from './config/configuration';
import { DatastoreService } from './repositories';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
    }),
    HttpModule,
    CacheModule.register(),
  ],
  providers: [
    CommunicateGateway,
    CommunicateService,
    VerseService,
    AllowCheckService,
    TransactionService,
    ProxyService,
    TypeCheckService,
    DatastoreService,
    RateLimitService,
  ],
})
export class EventsModule {}
