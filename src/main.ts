import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from 'src/app.module';
import { json } from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    json({
      limit: process.env.MAX_BODY_BYTE_SIZE
        ? parseInt(process.env.MAX_BODY_BYTE_SIZE, 10)
        : 524288,
    }),
  );
  app.useGlobalPipes(new ValidationPipe());
  app.enableCors({
    origin: '*',
    allowedHeaders: 'Origin, X-Requested-With, Content-Type, Accept',
  });
  await app.listen(process.env.PORT ? parseInt(process.env.PORT, 10) : 3000);
}
bootstrap();
