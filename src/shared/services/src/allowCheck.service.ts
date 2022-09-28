import { Injectable } from '@nestjs/common';

@Injectable()
export class AllowCheckService {
  isAllowedString(allowPattern: string, input: string): boolean {
    if (allowPattern[0] === '!' && allowPattern.slice(1) === input)
      return false;
    if (allowPattern === '*' || allowPattern === input) return true;
    return false;
  }
}
