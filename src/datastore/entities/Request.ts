import { IncomingHttpHeaders } from 'http';

export type RequestContext = {
  ip: string;
  headers: IncomingHttpHeaders;
};
