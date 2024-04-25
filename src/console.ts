import { NestFactory } from '@nestjs/core';
import { EventsModule } from './events.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(EventsModule);
  const configService = app.get(ConfigService);
  const wsPort = configService.get('wsPort');
  await app.listen(wsPort);
}

bootstrap();
