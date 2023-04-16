import { DataSourceOptions, DataSource } from 'typeorm';

const getOrmConfig = () => {
  const rdbUri = process.env.RDB_URI;
  if (!rdbUri) return;

  const config: DataSourceOptions = {
    type: 'mysql',
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
