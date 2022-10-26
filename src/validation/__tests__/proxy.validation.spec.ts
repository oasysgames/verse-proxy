import { isJsonrcp, isJsonrcpArray } from '../proxy.validation';

describe('isJsonrcp', () => {
  it('body is JsonrpcRequestBody', () => {
    const body = {
      jsonrpc: '2.0',
      method: 'eth_sendRawTransaction',
      params: [
        '0xf8620180825208948626f6940e2eb28930efb4cef49b2d1f2c9c11998080831e84a2a06c33b39c89e987ad08bc2cab79243dbb2a44955d2539d4f5d58001ae9ab0a2caa06943316733bd0fd81a0630a9876f6f07db970b93f367427404aabd0621ea5ec2',
      ],
      id: 1,
    };
    expect(isJsonrcp(body)).toBe(true);
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
    expect(isJsonrcp(body)).toBe(false);
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
    expect(isJsonrcp(body)).toBe(false);
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
    expect(isJsonrcp(body)).toBe(false);
  });

  it('body.params is not Array', () => {
    const body = {
      jsonrpc: '2.0',
      method: 'eth_sendRawTransaction',
      params: true,
      id: 1,
    };
    expect(isJsonrcp(body)).toBe(false);
  });
});

describe('isJsonrcp', () => {
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
    expect(isJsonrcpArray(body)).toBe(true);
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
    expect(isJsonrcpArray(body)).toBe(false);
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
    expect(isJsonrcpArray(body)).toBe(false);
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
    expect(isJsonrcpArray(body)).toBe(false);
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
    expect(isJsonrcpArray(body)).toBe(false);
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
    expect(isJsonrcpArray(body)).toBe(false);
  });
});
