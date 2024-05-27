import { JsonrpcId } from 'src/entities';

export class JsonrpcError extends Error {
  code: number;

  constructor(message: string, code: number) {
    super(message);
    this.code = code;
  }
}

export const INVALID_JSON_REQUEST = {
  jsonrpc: '2.0',
  id: null,
  error: {
    code: -32700,
    message: 'invalid json format',
  },
};

export const customRpcError = (
  message: string,
  args?: {
    id?: null | JsonrpcId;
    code?: number;
  },
) => ({
  jsonrpc: '2.0',
  id: args?.id ?? null,
  error: {
    code: args?.code ?? -32700,
    message,
  },
});
