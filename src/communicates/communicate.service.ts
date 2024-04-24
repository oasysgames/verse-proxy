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
    const err = this.checkMethod(method);
    if (err) {
      return err;
    }
    return data;
  }
  checkMethod(method: string): string | null {
    const checkMethod = this.allowedMethods.some((allowedMethod) => {
      return allowedMethod.test(method);
    });
    if (!checkMethod) {
      return `Method ${method} is not allowed`;
    } else {
      return null;
    }
  }
}
