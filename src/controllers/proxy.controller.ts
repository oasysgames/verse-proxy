import {
  Controller,
  Post,
  Headers,
  Body,
  ForbiddenException,
  Res,
  Ip,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IncomingHttpHeaders } from 'http';
import { Response } from 'express';
import { ProxyService, TypeCheckService } from 'src/services';
import { VerseRequestResponse, RequestContext } from 'src/entities';

@Controller()
export class ProxyController {
  constructor(
    private configService: ConfigService,
    private readonly typeCheckService: TypeCheckService,
    private readonly proxyService: ProxyService,
  ) {}

  @Post()
  async post(
    @Ip() ip: string,
    @Headers() headers: IncomingHttpHeaders,
    @Body() body: any,
    @Res() res: Response,
  ) {
    const requestContext = {
      ip,
      headers,
    };
    const isUseReadNode = !!this.configService.get<string>('verseReadNodeUrl');
    await this.handler(isUseReadNode, requestContext, body, res);
  }

  @Post('master')
  async postMaster(
    @Ip() ip: string,
    @Headers() headers: IncomingHttpHeaders,
    @Body() body: any,
    @Res() res: Response,
  ) {
    const requestContext = {
      ip,
      headers,
    };
    const isUseReadNode = false;
    await this.handler(isUseReadNode, requestContext, body, res);
  }

  async handler(
    isUseReadNode: boolean,
    requestContext: RequestContext,
    body: any,
    res: Response,
  ) {
    const callback = (result: VerseRequestResponse) => {
      const { status, data } = result;
      res.status(status).send(data);
    };

    if (this.typeCheckService.isJsonrpcArrayRequestBody(body)) {
      await this.proxyService.handleBatchRequest(
        isUseReadNode,
        requestContext,
        body,
        callback,
      );
    } else if (this.typeCheckService.isJsonrpcRequestBody(body)) {
      await this.proxyService.handleSingleRequest(
        isUseReadNode,
        requestContext,
        body,
        callback,
      );
    } else {
      throw new ForbiddenException(`invalid request`);
    }
  }
}
