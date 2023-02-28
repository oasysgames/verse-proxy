import { Module, DynamicModule, Provider } from '@nestjs/common';
import { Redis } from 'ioredis';

@Module({})
export class DatabaseModule {
  static register(): DynamicModule {
    const providers: Provider<any>[] = [];

    if (process.env.REDIS_URI) {
      const redisProvider = {
        provide: 'REDIS_CLIENT',
        useValue: new Redis(process.env.REDIS_URI),
      };
      providers.push(redisProvider);
    }

    return {
      module: DatabaseModule,
      providers: providers,
      exports: providers,
    };
  }
}
