import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from './modules';
import { ProxyController } from './controllers';
import {
  ProxyService,
  TransactionService,
  VerseService,
  AllowCheckService,
  JsonrpcCheckService,
} from './services';
import { RedisService } from './repositories';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
    }),
    HttpModule,
    DatabaseModule.register(),
  ],
  controllers: [ProxyController],
  providers: [
    VerseService,
    TransactionService,
    ProxyService,
    AllowCheckService,
    JsonrpcCheckService,
    RedisService,
  ],
})
export class AppModule {}
