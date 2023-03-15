import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from 'src/app.module';
import { json } from 'body-parser';
import * as _cluster from 'cluster';
import { cpus } from 'os';

const cluster = _cluster as unknown as _cluster.Cluster;
const workerCount = process.env.CLUSTER_PROCESS
  ? parseInt(process.env.CLUSTER_PROCESS, 10)
  : 1;

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

if (cluster.isPrimary) {
  const workerLimit = cpus().length;
  if (workerCount > workerLimit)
    throw new Error(
      `cluster process limit is ${workerLimit}. CLUSTER_PROCESS is over  ${workerLimit}`,
    );

  for (let i = 0; i < workerCount; i++) {
    console.log('cluster fork :', i);
    cluster.fork();
  }
} else {
  console.log('worker pid is', cluster.worker?.process.pid);
  bootstrap();
}
