export function getDriverFromUrl(connectionUrl: string): string {
  const start = connectionUrl.indexOf('://');
  return connectionUrl.substring(0, start);
}
