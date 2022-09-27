import { Module } from '@nestjs/common';
import { ProxyController } from './controllers/proxy.controller';
import { AppService } from './services/app.service';

@Module({
  imports: [],
  controllers: [ProxyController],
  providers: [AppService],
})
export class AppModule {}
