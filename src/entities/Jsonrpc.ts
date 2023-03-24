export type JsonrpcVersion = string;
export type JsonrpcId = number | string;
export type JsonrpcMethod = string;
export type JsonrpcParams = Array<any>;

export interface JsonrpcRequestBody {
  jsonrpc: JsonrpcVersion;
  id: JsonrpcId;
  method: JsonrpcMethod;
  params?: JsonrpcParams | null;
}

export interface JsonrpcTxSuccessResponse {
  jsonrpc: JsonrpcVersion;
  id: JsonrpcId;
  result: string;
}

interface JsonrpcError {
  code: number;
  message: string;
  data?: any;
}

export interface JsonrpcErrorResponse {
  jsonrpc: JsonrpcVersion;
  id: JsonrpcId;
  error: JsonrpcError;
}
