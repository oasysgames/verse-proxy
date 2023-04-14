import { Module, DynamicModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({})
export class RdbModule {
  static forRoot(rdbUri: string): DynamicModule {
    const imports = [
      TypeOrmModule.forRoot({
        type: 'mysql',
        url: rdbUri,
      }),
    ];
    return {
      module: RdbModule,
      imports: imports,
      exports: [TypeOrmModule],
    };
  }
}
