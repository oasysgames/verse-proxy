import { DataSourceOptions, DataSource } from 'typeorm';
import { getDriverFromUrl } from './utils';

const getOrmConfig = () => {
  const rdbUri = process.env.RDB_URI;
  if (!rdbUri) return;

  const dbType = getDriverFromUrl(rdbUri);
  const config = {
    type: dbType,
    url: rdbUri,
    synchronize: false,
    logging: false,
    entities: [__dirname + '/entities/*.ts'],
    migrations: [__dirname + '/migrations/*.ts'],
  } as DataSourceOptions;
  return config;
};

const ormConfig = getOrmConfig();

export default ormConfig ? new DataSource(ormConfig) : undefined;
