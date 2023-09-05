import { DataSourceOptions, DataSource } from 'typeorm';
import { getRdbDatabaseType } from './src/config/rdb';

const getOrmConfig = () => {
  const rdbUri = process.env.RDB_URI;
  if (!rdbUri) return;

  const dataSourceType = getRdbDatabaseType(rdbUri);

  const config: DataSourceOptions = {
    type: dataSourceType,
    url: rdbUri,
    synchronize: false,
    logging: false,
    entities: ['**/entities/rdb/*.ts'],
    migrations: [__dirname + '/migrations/*.ts'],
  };
  return config;
};

const ormConfig = getOrmConfig();

export default ormConfig ? new DataSource(ormConfig) : undefined;
