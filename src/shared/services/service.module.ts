import { Module } from '@nestjs/common';
import { AllowCheckService } from './src';

@Module({
  providers: [AllowCheckService],
})
export class ServiceModule {}
