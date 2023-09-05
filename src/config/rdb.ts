export const getRdbDatabaseType = (rdbUri: string) => {
  let dataSourceType: 'mysql' | 'postgres';
  const protocol = new URL(rdbUri).protocol;

  switch (protocol) {
    case 'mysql:':
      dataSourceType = 'mysql';
      break;
    case 'postgresql:':
      dataSourceType = 'postgres';
      break;
    default:
      throw new Error(
        `Unsupported protocol: ${protocol}. Only mysql and postgresql are supported.`,
      );
  }
  return dataSourceType;
};
