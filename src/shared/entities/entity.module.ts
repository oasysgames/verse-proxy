import { Module } from '@nestjs/common';
import { TransactionAllowList } from './src';

@Module({
  providers: [TransactionAllowList],
})
export class EntityModule {}
