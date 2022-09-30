import { Module } from '@nestjs/common';
import { ServiceModule } from './services/service.module';

@Module({
  imports: [ServiceModule],
  exports: [ServiceModule],
})
export class SharedModule {}
