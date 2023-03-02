import { Injectable } from '@nestjs/common';
import { JsonrpcRequestBody } from 'src/entities';

@Injectable()
export class TypeCheckService {
  isJsonrpcRequestBody(body: any): body is JsonrpcRequestBody {
    if (typeof body.jsonrpc !== 'string') return false;
    if (typeof body.id !== 'string' && typeof body.id !== 'number')
      return false;
    if (typeof body.method !== 'string') return false;
    if (
      !(
        Array.isArray(body.params) ||
        body.params === null ||
        body.params === undefined
      )
    )
      return false;
    return true;
  }

  isJsonrpcArrayRequestBody(body: any): body is Array<JsonrpcRequestBody> {
    if (!Array.isArray(body)) return false;
    return body.every(this.isJsonrpcRequestBody);
  }
}
