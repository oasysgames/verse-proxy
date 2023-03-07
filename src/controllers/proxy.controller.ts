import {
  Controller,
  Post,
  Headers,
  Body,
  ForbiddenException,
  Res,
  Ip,
} from '@nestjs/common';
import { IncomingHttpHeaders } from 'http';
import { Response } from 'express';
import { ProxyService, TypeCheckService } from 'src/services';
import { VerseRequestResponse } from 'src/entities';

@Controller()
export class ProxyController {
  constructor(
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
    const callback = (result: VerseRequestResponse) => {
      const { status, data } = result;
      res.status(status).send(data);
    };
    const requestContext = {
      ip,
      headers,
    };
    if (this.typeCheckService.isJsonrpcArrayRequestBody(body)) {
      await this.proxyService.handleBatchRequest(
        requestContext,
        body,
        callback,
      );
    } else if (this.typeCheckService.isJsonrpcRequestBody(body)) {
      await this.proxyService.handleSingleRequest(
        requestContext,
        body,
        callback,
      );
    } else {
      throw new ForbiddenException(`invalid request`);
    }
  }
}
