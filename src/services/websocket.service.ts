import { IncomingMessage } from 'http';
import * as WebSocket from 'ws';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getClientIp } from '@supercharge/request-ip';
import { JsonrpcId, JsonrpcRequestBody, RequestContext } from 'src/entities';
import { INVALID_JSON_REQUEST, customRpcError, randomStr } from 'src/shared';
import { ProxyService } from './proxy.service';

// https://developer.mozilla.org/docs/Web/API/CloseEvent/code
const WS_CODE_CLOSE = 1011;

const WS_STATUS = {
  [WebSocket.CONNECTING]: 'CONNECTING',
  [WebSocket.OPEN]: 'OPEN',
  [WebSocket.CLOSING]: 'CLOSING',
  [WebSocket.CLOSED]: 'CLOSED',
} as const;

/**
 * WSClientManagerService manages established WebSocket connections.
 * The handling of messages is delegated to WSClient.
 */
@Injectable()
export class WSClientManagerService {
  private readonly logger = new Logger('WSClientManager');
  private readonly clients = new Map<string, WSClient>();
  private readonly intervals: NodeJS.Timer[] = [];
  private readonly serverUrl: string;
  private readonly maxBodySize: number;

  constructor(
    private readonly config: ConfigService,
    private readonly proxy: ProxyService,
  ) {
    this.serverUrl = this.config.get<string>('verseWSUrl') || '';
    this.maxBodySize = this.config.get<number>('maxBodySize') || 524288;

    const gcInterval = this.config.get<number>('wsGCInterval') || 5000;
    this.intervals.push(this.gcLoop(gcInterval));
    this.intervals.push(this.statsLoop(gcInterval / 4));
  }

  get(id: string): WSClient | undefined {
    return this.clients.get(id);
  }

  async add(client: WebSocket, request: IncomingMessage) {
    if (!this.serverUrl) {
      this.logger.error('WebSocket server url is not configured');
      client.close(WS_CODE_CLOSE, 'websocket is not supported');
    }

    // if the message listener is not set quickly, messages may be missed.
    let initialMessage: undefined | WebSocket.RawData;
    client.once('message', (data) => (initialMessage = data));

    let server: WebSocket;
    try {
      server = await this._connectServer();
    } catch (err) {
      this.logger.error(`Server connection error: ${err}`);
      client.close(WS_CODE_CLOSE, 'server error');
      return;
    }

    const id = randomStr(32);
    const cleanup = (reason: string) => {
      this.mustClose(reason, server, client);
      this.clients.delete(id);
    };

    // set cleanup handlers
    server.on('error', (err) => {
      this.logger.error(`Server error: ${err}`);
      cleanup('server error');
    });
    server.on('close', () => {
      this.logger.debug('Server closed');
      cleanup('closed by server');
    });
    client.on('error', (err) => {
      this.logger.error(`Client error: ${err}`);
      cleanup('');
    });
    client.on('close', () => {
      this.logger.debug('Client closed');
      cleanup('');
    });

    // create client instance and store to Map
    this.clients.set(
      id,
      new WSClient(
        this.proxy,
        server,
        client,
        {
          ip: getClientIp(request) as string,
          headers: request.headers,
        },
        initialMessage,
      ),
    );
  }

  // This method does not need to be publicly accessible,
  // but it is made public to allow mocking from test code.
  _connectServer() {
    return new Promise<WebSocket>((resolve, reject) => {
      const server = new WebSocket(this.serverUrl, {
        maxPayload: this.maxBodySize,
      });
      server.once('open', () => {
        this.logger.debug('Server connected');
        resolve(server);
      });
      server.once('error', (err) => reject(err));
    });
  }

  // for testing
  close() {
    this.intervals.forEach((x) => clearInterval(x));
  }

  private mustClose(reason: string, ...sockets: WebSocket[]) {
    for (const s of sockets) {
      try {
        s.close(WS_CODE_CLOSE, reason);
      } catch (err) {
        this.logger.error(err);
      }
    }
  }

  private gcLoop(interval: number): NodeJS.Timer {
    return setInterval(() => {
      for (const c of this.clients.values()) {
        const server = c.server.readyState;
        const client = c.client.readyState;
        if (server === WebSocket.CLOSED || client === WebSocket.CLOSED) {
          this.logger.warn(
            `GC: ServerStatus=${WS_STATUS[server]} ClientStatus=${WS_STATUS[client]}`,
          );
          c.server.close();
          c.client.close();
        }
      }
    }, interval);
  }

  private statsLoop(interval: number): NodeJS.Timer {
    return setInterval(() => {
      this.logger.log(`Connected ${this.clients.size} clients`);
    }, interval);
  }
}

/**
 * WSClient handles the exchange of WebSocket messages. Once instantiated,
 * it opens a connection to the backend WebSocket server and acts as a kind
 * of pipe between the server and the client.
 */
export class WSClient {
  private readonly logger = new Logger('WSClient');
  private readonly requests = new Map<JsonrpcId, any>();

  constructor(
    readonly proxy: ProxyService,
    readonly server: WebSocket,
    readonly client: WebSocket,
    readonly context: RequestContext,
    initialMessage?: WebSocket.RawData,
  ) {
    // server listener must be set before `onClientMessage` is first called
    this.server.on('message', (data) => {
      this.logger.debug(`Server message: ${data}`);
      this.onServerMessage(data);
    });

    if (initialMessage) {
      this.onClientMessage(initialMessage);
    }
    this.client.on('message', (data) => {
      this.logger.debug(`Client message: ${data}`);
      this.onClientMessage(data);
    });
  }

  /**
   * Send an RPC request to the WebSocket server. The caller can obtain the
   * response message from the WebSocket server by awaiting the returned Promise.
   * @param request RPC request body from the websocket client
   * @param interval Interval for checking the server response (milliseconds)
   * @param timeout Maximum wait time for server response (milliseconds)
   * @returns RPC response body from the websocket server
   */
  sendToServer(request: JsonrpcRequestBody, interval = 20, timeout = 5000) {
    // Record the ID of the RPC request sent to the server. When a response
    // with this ID is received from the WebSocket server, forward it to
    // the ProxyService instead of passing it directly to the client.
    // This approach allows clear differentiation between responses to
    // RPC requests and intermittent subscription messages such as `newHeads`.

    // The ID needs to be rewritten because it becomes indistinguishable
    // if it overlaps with other requests.
    const originalID = request.id;
    const alternateID = randomStr(16);

    this.requests.set(alternateID, null);
    this.server.send(JSON.stringify({ ...request, id: alternateID }));

    return new Promise((resolve) => {
      let elapsed = 0;
      const timer = setInterval(() => {
        elapsed += interval;

        let data = this.requests.get(alternateID);
        if (!data) {
          if (elapsed < timeout) {
            return; // continue
          }
          data = customRpcError('request timeout');
        }

        clearInterval(timer);
        this.requests.delete(alternateID);

        data.id = originalID;
        resolve(data);
      }, interval);
    });
  }

  private onServerMessage(rawData: WebSocket.RawData) {
    // believe server messages are json
    const data = JSON.parse(rawData.toString());

    if (!data.id || !this.requests.has(data.id)) {
      // pass-through to the client
      this.client.send(rawData);
    } else {
      // pass it to the ProxyService that is waiting for the response via promise
      this.requests.set(data.id, data);
    }
  }

  private async onClientMessage(rawData: WebSocket.RawData) {
    const req = rawData.toString();

    // for connection test
    if (req == 'ping') {
      this.client.send('pong');
      return;
    }

    // check if the request is JSON
    let reqjson: any;
    try {
      reqjson = JSON.parse(req);
    } catch {
      this.client.send(JSON.stringify(INVALID_JSON_REQUEST));
      return;
    }

    let res: any;
    try {
      // proxy the request
      const r = await this.proxy.proxy(this.context, reqjson, { ws: this });
      res = r.data;
    } catch (err) {
      if (err instanceof Error) {
        res = customRpcError(err.message);
      } else {
        res = customRpcError(String(err));
      }
    }
    this.client.send(JSON.stringify(res));
  }
}
