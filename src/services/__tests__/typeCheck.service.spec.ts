import { TypeCheckService } from 'src/services';

const typeCheckService = new TypeCheckService();

describe('isJsonrpc', () => {
  it('body is JsonrpcRequestBody', () => {
    const body = {
      jsonrpc: '2.0',
      method: 'eth_sendRawTransaction',
      params: [
        '0xf8620180825208948626f6940e2eb28930efb4cef49b2d1f2c9c11998080831e84a2a06c33b39c89e987ad08bc2cab79243dbb2a44955d2539d4f5d58001ae9ab0a2caa06943316733bd0fd81a0630a9876f6f07db970b93f367427404aabd0621ea5ec2',
      ],
      id: 1,
    };
    expect(typeCheckService.isJsonrpcRequestBody(body)).toBe(true);
  });

  it('body.jsonrpc is not string', () => {
    const body = {
      jsonrpc: 2.0,
      method: 'eth_sendRawTransaction',
      params: [
        '0xf8620180825208948626f6940e2eb28930efb4cef49b2d1f2c9c11998080831e84a2a06c33b39c89e987ad08bc2cab79243dbb2a44955d2539d4f5d58001ae9ab0a2caa06943316733bd0fd81a0630a9876f6f07db970b93f367427404aabd0621ea5ec2',
      ],
      id: 1,
    };
    expect(typeCheckService.isJsonrpcRequestBody(body)).toBe(false);
  });

  it('body.id is not string or number', () => {
    const body = {
      jsonrpc: '2.0',
      method: 'eth_sendRawTransaction',
      params: [
        '0xf8620180825208948626f6940e2eb28930efb4cef49b2d1f2c9c11998080831e84a2a06c33b39c89e987ad08bc2cab79243dbb2a44955d2539d4f5d58001ae9ab0a2caa06943316733bd0fd81a0630a9876f6f07db970b93f367427404aabd0621ea5ec2',
      ],
      id: true,
    };
    expect(typeCheckService.isJsonrpcRequestBody(body)).toBe(false);
  });

  it('body.method is not string', () => {
    const body = {
      jsonrpc: '2.0',
      method: 1,
      params: [
        '0xf8620180825208948626f6940e2eb28930efb4cef49b2d1f2c9c11998080831e84a2a06c33b39c89e987ad08bc2cab79243dbb2a44955d2539d4f5d58001ae9ab0a2caa06943316733bd0fd81a0630a9876f6f07db970b93f367427404aabd0621ea5ec2',
      ],
      id: 1,
    };
    expect(typeCheckService.isJsonrpcRequestBody(body)).toBe(false);
  });

  it('body.params is not Array', () => {
    const body = {
      jsonrpc: '2.0',
      method: 'eth_sendRawTransaction',
      params: true,
      id: 1,
    };
    expect(typeCheckService.isJsonrpcRequestBody(body)).toBe(false);
  });

  it('body.params is empty Array', () => {
    const body = {
      jsonrpc: '2.0',
      method: 'eth_sendRawTransaction',
      params: [],
      id: 1,
    };
    expect(typeCheckService.isJsonrpcRequestBody(body)).toBe(true);
  });

  it('body.params is undefined', () => {
    const body = {
      jsonrpc: '2.0',
      method: 'eth_sendRawTransaction',
      params: undefined,
      id: 1,
    };
    expect(typeCheckService.isJsonrpcRequestBody(body)).toBe(true);
  });

  it('body.params is null', () => {
    const body = {
      jsonrpc: '2.0',
      method: 'eth_sendRawTransaction',
      params: null,
      id: 1,
    };
    expect(typeCheckService.isJsonrpcRequestBody(body)).toBe(true);
  });
});

describe('isJsonrpcArray', () => {
  it('body is JsonrpcRequestBodyArray', () => {
    const body = [
      {
        jsonrpc: '2.0',
        method: 'eth_sendRawTransaction',
        params: [
          '0xf8620180825208948626f6940e2eb28930efb4cef49b2d1f2c9c11998080831e84a2a06c33b39c89e987ad08bc2cab79243dbb2a44955d2539d4f5d58001ae9ab0a2caa06943316733bd0fd81a0630a9876f6f07db970b93f367427404aabd0621ea5ec1',
        ],
        id: 1,
      },
      {
        jsonrpc: '2.0',
        method: 'net_version',
        params: [],
        id: 1,
      },
    ];
    expect(typeCheckService.isJsonrpcArrayRequestBody(body)).toBe(true);
  });

  it('body is not array', () => {
    const body = {
      jsonrpc: '2.0',
      method: 'eth_sendRawTransaction',
      params: [
        '0xf8620180825208948626f6940e2eb28930efb4cef49b2d1f2c9c11998080831e84a2a06c33b39c89e987ad08bc2cab79243dbb2a44955d2539d4f5d58001ae9ab0a2caa06943316733bd0fd81a0630a9876f6f07db970b93f367427404aabd0621ea5ec2',
      ],
      id: 1,
    };
    expect(typeCheckService.isJsonrpcArrayRequestBody(body)).toBe(false);
  });

  it('body does not have string jsonrpc', () => {
    const body = [
      {
        jsonrpc: 2.0,
        method: 'eth_sendRawTransaction',
        params: [
          '0xf8620180825208948626f6940e2eb28930efb4cef49b2d1f2c9c11998080831e84a2a06c33b39c89e987ad08bc2cab79243dbb2a44955d2539d4f5d58001ae9ab0a2caa06943316733bd0fd81a0630a9876f6f07db970b93f367427404aabd0621ea5ec1',
        ],
        id: 1,
      },
      {
        jsonrpc: '2.0',
        method: 'net_version',
        params: [],
        id: 1,
      },
    ];
    expect(typeCheckService.isJsonrpcArrayRequestBody(body)).toBe(false);
  });

  it('body does not have id which is string or number', () => {
    const body = [
      {
        jsonrpc: '2.0',
        method: 'eth_sendRawTransaction',
        params: [
          '0xf8620180825208948626f6940e2eb28930efb4cef49b2d1f2c9c11998080831e84a2a06c33b39c89e987ad08bc2cab79243dbb2a44955d2539d4f5d58001ae9ab0a2caa06943316733bd0fd81a0630a9876f6f07db970b93f367427404aabd0621ea5ec1',
        ],
        id: true,
      },
      {
        jsonrpc: '2.0',
        method: 'net_version',
        params: [],
        id: 1,
      },
    ];
    expect(typeCheckService.isJsonrpcArrayRequestBody(body)).toBe(false);
  });

  it('body does not have string method', () => {
    const body = [
      {
        jsonrpc: '2.0',
        method: true,
        params: [
          '0xf8620180825208948626f6940e2eb28930efb4cef49b2d1f2c9c11998080831e84a2a06c33b39c89e987ad08bc2cab79243dbb2a44955d2539d4f5d58001ae9ab0a2caa06943316733bd0fd81a0630a9876f6f07db970b93f367427404aabd0621ea5ec1',
        ],
        id: 1,
      },
      {
        jsonrpc: '2.0',
        method: 'net_version',
        params: [],
        id: 1,
      },
    ];
    expect(typeCheckService.isJsonrpcArrayRequestBody(body)).toBe(false);
  });

  it('body does not have array params', () => {
    const body = [
      {
        jsonrpc: '2.0',
        method: 'eth_sendRawTransaction',
        params: true,
        id: 1,
      },
      {
        jsonrpc: '2.0',
        method: 'net_version',
        params: [],
        id: 1,
      },
    ];
    expect(typeCheckService.isJsonrpcArrayRequestBody(body)).toBe(false);
  });
});

describe('isJsonrpcTxSuccessResponse', () => {
  it('res is isJsonrpcTxSuccessResponse', () => {
    const res = {
      jsonrpc: '2.0',
      id: 1,
      result:
        '0x4e17f462637f7658646cb30f297ae5284a08f1d5aacec738454ea8b03602c53c',
    };
    expect(typeCheckService.isJsonrpcTxSuccessResponse(res)).toBe(true);
  });

  it('res.jsonrpc is not string', () => {
    const res = {
      jsonrpc: 2.0,
      id: 1,
      result:
        '0x4e17f462637f7658646cb30f297ae5284a08f1d5aacec738454ea8b03602c53c',
    };
    expect(typeCheckService.isJsonrpcTxSuccessResponse(res)).toBe(false);
  });

  it('res.id is not string or number', () => {
    const res = {
      jsonrpc: '2.0',
      id: true,
      result:
        '0x4e17f462637f7658646cb30f297ae5284a08f1d5aacec738454ea8b03602c53c',
    };
    expect(typeCheckService.isJsonrpcTxSuccessResponse(res)).toBe(false);
  });

  it('res.result is not string', () => {
    const res = {
      jsonrpc: '2.0',
      id: 1,
      result: 1,
    };
    expect(typeCheckService.isJsonrpcTxSuccessResponse(res)).toBe(false);
  });

  it('res.result is string and is not 66 characters', () => {
    const res = {
      jsonrpc: '2.0',
      id: 1,
      result: '0x4e17f462637f7658646cb30f297ae5284a08f1d5aacec738454ea8',
    };
    expect(typeCheckService.isJsonrpcTxSuccessResponse(res)).toBe(false);
  });

  it('res.result is not tx hash string', () => {
    const res = {
      jsonrpc: '2.0',
      id: 1,
      result:
        'aa4e17f462637f7658646cb30f297ae5284a08f1d5aacec738454ea8b03602c53c',
    };
    expect(typeCheckService.isJsonrpcTxSuccessResponse(res)).toBe(false);
  });
});

describe('isJsonrpcBlockNumberSuccessResponse', () => {
  it('res is isJsonrpcBlockNumberSuccessResponse', () => {
    const res = {
      jsonrpc: '2.0',
      id: 1,
      result: '0x15bf',
    };
    expect(typeCheckService.isJsonrpcBlockNumberSuccessResponse(res)).toBe(
      true,
    );
  });

  it('res.jsonrpc is not string', () => {
    const res = {
      jsonrpc: 2.0,
      id: 1,
      result: '0x15bf',
    };
    expect(typeCheckService.isJsonrpcBlockNumberSuccessResponse(res)).toBe(
      false,
    );
  });

  it('res.id is not string or number', () => {
    const res = {
      jsonrpc: '2.0',
      id: true,
      result: '0x15bf',
    };
    expect(typeCheckService.isJsonrpcBlockNumberSuccessResponse(res)).toBe(
      false,
    );
  });

  it('res.result is not string', () => {
    const res = {
      jsonrpc: '2.0',
      id: 1,
      result: 1,
    };
    expect(typeCheckService.isJsonrpcBlockNumberSuccessResponse(res)).toBe(
      false,
    );
  });

  it('res.result is not hex string', () => {
    const res = {
      jsonrpc: '2.0',
      id: 1,
      result: 'aaa',
    };
    expect(typeCheckService.isJsonrpcBlockNumberSuccessResponse(res)).toBe(
      false,
    );
  });
});

describe('isJsonrpcErrorResponse', () => {
  it('res is isJsonrpcTxResponse', () => {
    const res = {
      jsonrpc: '2.0',
      id: 1,
      error: {
        code: -32000,
        message: 'execution reverted:',
      },
    };
    expect(typeCheckService.isJsonrpcErrorResponse(res)).toBe(true);
  });

  it('res.jsonrpc is not string', () => {
    const res = {
      jsonrpc: 2.0,
      id: 1,
      error: {
        code: -32000,
        message: 'execution reverted:',
      },
    };
    expect(typeCheckService.isJsonrpcErrorResponse(res)).toBe(false);
  });

  it('res.id is not string or number', () => {
    const res = {
      jsonrpc: '2.0',
      id: true,
      error: {
        code: -32000,
        message: 'execution reverted:',
      },
    };
    expect(typeCheckService.isJsonrpcErrorResponse(res)).toBe(false);
  });

  it('res.error.code is not number', () => {
    const res = {
      jsonrpc: '2.0',
      id: 1,
      error: {
        code: 'aaa',
        message: 'execution reverted:',
      },
    };
    expect(typeCheckService.isJsonrpcErrorResponse(res)).toBe(false);
  });

  it('res.error.message is not string', () => {
    const res = {
      jsonrpc: '2.0',
      id: 1,
      error: {
        code: -32000,
        message: true,
      },
    };
    expect(typeCheckService.isJsonrpcErrorResponse(res)).toBe(false);
  });
});
