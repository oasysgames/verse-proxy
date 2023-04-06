import { Module, DynamicModule } from '@nestjs/common';
import { Redis } from 'ioredis';

@Module({})
export class RedisModule {
  static forRoot(redisUri: string): DynamicModule {
    const redis = new Redis(redisUri);
    const providers = [
      {
        provide: 'REDIS',
        useValue: redis,
      },
    ];

    return {
      module: RedisModule,
      providers: providers,
      exports: providers,
    };
  }
}
