import { Module, DynamicModule } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DatabaseType } from 'typeorm';
import { getDriverFromUrl } from './utils';

@Module({})
export class RdbModule {
  static forRoot(rdbUri: string): DynamicModule {
    const dbType = getDriverFromUrl(rdbUri) as DatabaseType;

    const config: TypeOrmModuleOptions = {
      type: dbType,
      url: rdbUri,
      synchronize: false,
      logging: false,
      autoLoadEntities: true,
      migrations: [__dirname + '/migrations/*.ts'],
    };

    const imports = [TypeOrmModule.forRoot(config)];
    return {
      module: RdbModule,
      imports: imports,
      exports: [TypeOrmModule],
    };
  }
}
