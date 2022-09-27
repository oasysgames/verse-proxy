import { Controller, Post, Req } from '@nestjs/common';
import { AppService } from '../services/app.service';

@Controller()
export class ProxyController {
  constructor(private readonly appService: AppService) {}

  @Post()
  redirectVerse(@Req() request: Request) {
    console.log('===========');
    console.log(request.body);
    return {};
  }
}
