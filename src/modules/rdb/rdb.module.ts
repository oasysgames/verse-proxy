import { Module, DynamicModule } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';

@Module({})
export class RdbModule {
  static forRoot(rdbUri: string): DynamicModule {
    const config: TypeOrmModuleOptions = {
      type: 'mysql',
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
