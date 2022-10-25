import {
  Controller,
  Post,
  Headers,
  Body,
  ForbiddenException,
  Res,
} from '@nestjs/common';
import { IncomingHttpHeaders } from 'http';
import { Response } from 'express';
import { ProxyService } from 'src/services';
import { isJsonrcp, isJsonrcpArray } from 'src/validation';
import { VerseRequestResponse } from 'src/shared/entities';

@Controller()
export class ProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @Post()
  async requestVerse(
    @Headers() headers: IncomingHttpHeaders,
    @Body() body: any,
    @Res() res: Response,
  ) {
    const callback = (result: VerseRequestResponse) => {
      const { status, data } = result;
      res.status(status).send(data);
    };
    if (isJsonrcpArray(body)) {
      await this.proxyService.handleBatchRequest(headers, body, callback);
    } else if (isJsonrcp(body)) {
      await this.proxyService.handleSingleRequest(headers, body, callback);
    }
    throw new ForbiddenException(`invalid request`);
  }
}
