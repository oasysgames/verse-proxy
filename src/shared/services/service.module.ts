import { Module } from '@nestjs/common';
import { AllowCheckService, JsonrpcCheckService } from './src';

@Module({
  providers: [AllowCheckService, JsonrpcCheckService],
})
export class ServiceModule {}
