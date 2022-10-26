import { Injectable } from '@nestjs/common';
import { JsonrpcRequestBody } from 'src/shared/entities';

@Injectable()
export class JsonrpcCheckService {
  isJsonrcp(body: any): body is JsonrpcRequestBody {
    if (typeof body.jsonrpc !== 'string') return false;
    if (typeof body.id !== 'string' && typeof body.id !== 'number')
      return false;
    if (typeof body.method !== 'string') return false;
    if (!Array.isArray(body.params)) return false;
    return true;
  }

  isJsonrcpArray(body: any): body is Array<JsonrpcRequestBody> {
    let check = true;
    if (!Array.isArray(body)) return false;
    body.forEach((request) => {
      if (typeof request.jsonrpc !== 'string') check = false;
      if (typeof request.id !== 'string' && typeof request.id !== 'number')
        check = false;
      if (typeof request.method !== 'string') check = false;
      if (!Array.isArray(request.params)) check = false;
    });
    return check;
  }
}
