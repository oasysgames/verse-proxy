import { Controller, Post, Headers, Body, Res } from '@nestjs/common';
import { IncomingHttpHeaders } from 'http';
import { RealIP } from 'nestjs-real-ip';
import { Response } from 'express';
import { ProxyService } from 'src/services';

@Controller()
export class ProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @Post()
  async post(
    @RealIP() ip: string, // https://github.com/p0vidl0/nestjs-real-ip#under-the-hood
    @Headers() headers: IncomingHttpHeaders,
    @Body() body: any,
    @Res() res: Response,
  ) {
    const { status, data } = await this.proxyService.proxy(
      { ip, headers },
      body,
    );
    res.status(status).send(data);
  }

  @Post('master')
  async postMaster(
    @RealIP() ip: string, // https://github.com/p0vidl0/nestjs-real-ip#under-the-hood
    @Headers() headers: IncomingHttpHeaders,
    @Body() body: any,
    @Res() res: Response,
  ) {
    const { status, data } = await this.proxyService.proxy(
      { ip, headers },
      body,
      { forceUseMasterNode: true },
    );
    res.status(status).send(data);
  }
}
