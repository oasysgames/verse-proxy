import { Module } from '@nestjs/common';
import { EntityModule } from './entities/entity.module';
import { ServiceModule } from './services/service.module';

@Module({
  imports: [ServiceModule, EntityModule],
  exports: [ServiceModule, EntityModule],
})
export class SharedModule {}
