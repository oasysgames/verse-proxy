import { Module, DynamicModule } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { BlockNumberCache, TransactionCount } from 'src/entities';

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

    const imports = [
      TypeOrmModule.forRoot(config),
      TypeOrmModule.forFeature([BlockNumberCache, TransactionCount]),
    ];
    const providers = [
      {
        provide: 'RDB_URI',
        useValue: rdbUri,
      },
    ];
    return {
      module: RdbModule,
      imports: imports,
      providers: providers,
      exports: [TypeOrmModule, ...providers],
    };
  }
}
