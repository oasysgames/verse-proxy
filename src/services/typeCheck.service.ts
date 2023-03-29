import { Injectable } from '@nestjs/common';
import {
  JsonrpcRequestBody,
  JsonrpcTxSuccessResponse,
  JsonrpcBlockNumberSuccessResponse,
  JsonrpcErrorResponse,
} from 'src/entities';

@Injectable()
export class TypeCheckService {
  isStringArray(value: any): value is string[] {
    if (!Array.isArray(value)) {
      return false;
    }
    return value.every((item) => typeof item === 'string');
  }

  isJsonrpcRequestBody(body: any): body is JsonrpcRequestBody {
    if (
      typeof body.jsonrpc === 'string' &&
      (typeof body.id === 'string' || typeof body.id === 'number') &&
      typeof body.method === 'string' &&
      (Array.isArray(body.params) ||
        body.params === null ||
        body.params === undefined)
    ) {
      return true;
    }
    return false;
  }

  isJsonrpcArrayRequestBody(body: any): body is Array<JsonrpcRequestBody> {
    if (!Array.isArray(body)) return false;
    return body.every(this.isJsonrpcRequestBody);
  }

  isJsonrpcTxSuccessResponse(res: any): res is JsonrpcTxSuccessResponse {
    if (
      typeof res.jsonrpc === 'string' &&
      (typeof res.id === 'string' || typeof res.id === 'number') &&
      typeof res.result === 'string' &&
      res.result.length === 66 &&
      res.result.startsWith('0x')
    ) {
      return true;
    }
    return false;
  }

  isJsonrpcBlockNumberSuccessResponse(
    res: any,
  ): res is JsonrpcBlockNumberSuccessResponse {
    if (
      typeof res.jsonrpc === 'string' &&
      (typeof res.id === 'string' || typeof res.id === 'number') &&
      typeof res.result === 'string' &&
      res.result.startsWith('0x')
    ) {
      return true;
    }
    return false;
  }

  isJsonrpcErrorResponse(res: any): res is JsonrpcErrorResponse {
    if (
      typeof res.jsonrpc === 'string' &&
      (typeof res.id === 'string' || typeof res.id === 'number') &&
      typeof res.error?.code === 'number' &&
      typeof res.error?.message === 'string'
    ) {
      return true;
    }
    return false;
  }
}
