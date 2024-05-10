export const INVALID_JSON_REQUEST = `{
    "jsonrpc": "2.0",
    "id": null,
    "error": {
        "code": -32700,
        "message": "invalid json format"
    }
}`;

export const METHOD_IS_NOT_ALLOWED = `{
    "jsonrpc": "2.0",
    "id": null,
    "error": {
        "code": -32601,
        "message": "method not allowed"
    }
}`;

export const CONNECTION_IS_CLOSED = `{
    "jsonrpc": "2.0",
    "id": null,
    "error": {
        "code": -32601,
        "message": "connection is closed"
    }
}`;

export enum ESocketError {
  INVALID_JSON_REQUEST = 'INVALID_JSON_REQUEST',
  METHOD_IS_NOT_ALLOWED = 'METHOD_IS_NOT_ALLOWED',
  CONNECTION_IS_CLOSED = 'CONNECTION_IS_CLOSED',
}