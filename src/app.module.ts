import { Module, DynamicModule } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
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
import { DatastoreService } from './repositories';
import configuration from './config/configuration';
import { RedisModule } from './modules';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
    }),
    HttpModule,
    CacheModule.register(),
  ],
  controllers: [ProxyController],
  providers: [
    VerseService,
    TransactionService,
    ProxyService,
    AllowCheckService,
    TypeCheckService,
    DatastoreService,
    RateLimitService,
  ],
})
export class AppModule {
  static forRoot(): DynamicModule {
    if (process.env.REDIS_URI) {
      return {
        module: AppModule,
        imports: [
          ConfigModule.forRoot({
            load: [configuration],
          }),
          HttpModule,
          CacheModule.register(),
          RedisModule.forRoot(process.env.REDIS_URI),
        ],
        controllers: [ProxyController],
        providers: [
          VerseService,
          TransactionService,
          ProxyService,
          AllowCheckService,
          TypeCheckService,
          DatastoreService,
          RateLimitService,
        ],
      };
    } else {
      return {
        module: AppModule,
        imports: [
          ConfigModule.forRoot({
            load: [configuration],
          }),
          HttpModule,
          CacheModule.register(),
        ],
        controllers: [ProxyController],
        providers: [
          VerseService,
          TransactionService,
          ProxyService,
          AllowCheckService,
          TypeCheckService,
          DatastoreService,
          RateLimitService,
        ],
      };
    }
  }
}
