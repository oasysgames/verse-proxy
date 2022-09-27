import { Module } from '@nestjs/common';
import { ProxyController } from './controllers/proxy.controller';
import { TransactionService } from './services/transaction.service';

@Module({
  imports: [],
  controllers: [ProxyController],
  providers: [TransactionService],
})
export class AppModule {}
