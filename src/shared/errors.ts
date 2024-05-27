import { JsonrpcId } from 'src/entities';

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
