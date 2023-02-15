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
import { ProxyService, JsonrpcCheckService } from 'src/services';
import { VerseRequestResponse } from 'src/entities';

@Controller()
export class ProxyController {
  constructor(
    private readonly jsonrpcCheckService: JsonrpcCheckService,
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
    if (this.jsonrpcCheckService.isJsonrcpArray(body)) {
      await this.proxyService.handleBatchRequest(ip, headers, body, callback);
    } else if (this.jsonrpcCheckService.isJsonrcp(body)) {
      await this.proxyService.handleSingleRequest(ip, headers, body, callback);
    } else {
      throw new ForbiddenException(`invalid request`);
    }
  }
}
