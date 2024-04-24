import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebsocketError } from '../entities';

@Injectable()
export class CommunicateService {
  private allowedMethods: RegExp[];

  constructor(private readonly configService: ConfigService) {
    this.allowedMethods = this.configService.get<RegExp[]>(
      'allowedMethods',
    ) ?? [/^.*$/];
  }

  async sendRequest(method: string, data: string): Promise<string> {
    this.checkMethod(method);
    return data;
  }
  checkMethod(method: string) {
    const checkMethod = this.allowedMethods.some((allowedMethod) => {
      return allowedMethod.test(method);
    });
    if (!checkMethod)
      throw new WebsocketError(`${method} is not allowed`, -32601);
  }
}
