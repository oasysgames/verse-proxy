import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DatastoreService } from './datastore/services';
import { AppModule } from 'src/app.module';
import { json } from 'body-parser';
import * as _cluster from 'cluster';
import { cpus } from 'os';

const cluster = _cluster as unknown as _cluster.Cluster;
let workerCount = process.env.CLUSTER_PROCESS
  ? parseInt(process.env.CLUSTER_PROCESS, 10)
  : 1;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const datastoreService = app.get(DatastoreService);
  await datastoreService.setHeartBeat();

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

  if (workerCount > workerLimit) {
    console.warn(
      `cluster process limit is ${workerLimit}. cluster process count is set to ${workerLimit}.`,
    );
    workerCount = workerLimit;
  }

  for (let i = 0; i < workerCount; i++) {
    console.log('cluster fork :', i);
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(
      `Worker ${worker.process.pid} died with code(${code}) and signal(${signal}). Restarting...`,
    );
    cluster.fork();
  });
} else {
  console.log('worker pid is', cluster.worker?.process.pid);
  bootstrap();
}
