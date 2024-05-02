import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JsonrpcError, JsonrpcRequestBody, RequestContext } from '../entities';
import { VerseService, TransactionService, ProxyService } from 'src/services';

@Injectable()
export class CommunicateService {
  private allowedMethods: RegExp[];
  private isUseBlockNumberCache: boolean;

  constructor(
    private readonly configService: ConfigService,
    private verseService: VerseService,
    private txService: TransactionService,
    private proxyService: ProxyService,
  ) {
    this.isUseBlockNumberCache = !!this.configService.get<number>(
      'blockNumberCacheExpire',
    );
    this.allowedMethods = this.configService.get<RegExp[]>(
      'allowedMethods',
    ) ?? [/^.*$/];
  }

  async sendRequest(requestContext: RequestContext, body: JsonrpcRequestBody) {
    const isUseReadNode = !!this.configService.get<string>('verseReadNodeUrl');
    const result = await this.send(isUseReadNode, requestContext, body);

    return result;
  }

  checkMethod(method: string) {
    const checkMethod = this.allowedMethods.some((allowedMethod) => {
      return allowedMethod.test(method);
    });
    if (!checkMethod)
      throw new JsonrpcError(`Method ${method} is not allowed`, -32601);
  }

  async send(
    isUseReadNode: boolean,
    requestContext: RequestContext,
    body: JsonrpcRequestBody,
  ) {
    try {
      const method = body.method;
      const { headers } = requestContext;
      this.checkMethod(method);

      if (method === 'eth_sendRawTransaction') {
        return await this.proxyService.sendTransaction(requestContext, body);
      } else if (method === 'eth_estimateGas') {
        return await this.verseService.postVerseMasterNode(headers, body);
      } else if (method === 'eth_blockNumber' && this.isUseBlockNumberCache) {
        return await this.txService.getBlockNumberCacheRes(
          requestContext,
          body.jsonrpc,
          body.id,
        );
      }

      if (isUseReadNode) {
        return await this.verseService.postVerseReadNode(headers, body);
      } else {
        return await this.verseService.postVerseMasterNode(headers, body);
      }
    } catch (err) {
      const status = 200;
      if (err instanceof JsonrpcError) {
        const data = {
          jsonrpc: body.jsonrpc,
          id: body.id,
          error: {
            code: err.code,
            message: err.message,
          },
        };
        return {
          status,
          data,
        };
      }
      console.error(err);
      return {
        status,
        data: err,
      };
    }
  }
}
