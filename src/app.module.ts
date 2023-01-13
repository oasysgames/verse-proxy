import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProxyController } from './controllers';
import {
  ProxyService,
  TransactionService,
  VerseService,
  AllowCheckService,
  JsonrpcCheckService,
} from './services';
import { Deployer } from './entities';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DATABASE_HOST ?? '',
      port: process.env.DATABASE_PORT
        ? Number(process.env.DATABASE_PORT)
        : 3306,
      username: process.env.DATABASE_USER_NAME ?? '',
      password: process.env.DATABASE_USER_PASSWORD ?? '',
      database: process.env.DATABASE_NAME ?? '',
      entities: [Deployer],
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
