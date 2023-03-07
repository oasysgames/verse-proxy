# Webhook
You can add webhook setting that execute your original transaction restriction in another environment.

This setting allows you to post a request to a specified location before executing a transaction.
You can then use that request to implement your own request control.

| key  |  description  | Required |
| ---- | ---- | ---- |
|  url  | Your restriction webhook url  | O |
|  headers  |  Information that you want to send to webhook(described later) as http_header | X |
|  timeout  |  Webhook request timeout(ms)  | O |
|  retry  |   Webhook request retry times  | O |
|  parse  | Whether to parse tx in the proxy(described later) | O |

```typescript
export const getTxAllowList = (): Array<TransactionAllow> => {
  return [
    {
      fromList: ['*'],
      toList: ['*'],
      webhooks: [
        {
          url: 'https://localhost:8080',
          headers: {
            Authorization: 'Bearer xxxxxxxx',
          },
          timeout: 1000, // 1000 is 1 second.
          retry: 3,
          parse: false,
        },
      ],
    },
  ];
};
// You can set multiple webhook to `webhooks`.
export const getTxAllowList = (): Array<TransactionAllow> => {
  return [
    {
      fromList: ['*'],
      toList: ['*'],
      webhooks: [
        {
          url: 'https://localhost:8080',
          headers: {
            Authorization: 'Bearer xxxxxxxx',
          },
          timeout: 1000, // 1000 is 1 second.
          retry: 3,
          parse: false,
        },
        {
          url: 'https://localhost:8000',
          timeout: 1000, // 1000 is 1 second.
          retry: 3,
          parse: false,
        },
      ],
    },
  ];
};
```

Webhook Request body patterns are following.

| Body key  |  Description  |
| ---- | ---- |
|  _meta.ip  |  client ip address  |
|  _meta.headers.host  |  jsonrpc host  |
|  _meta.headers.user-agent  |  client user agent  |
| * | transaction data is set in body according to parse setting.



In case that header is not set and parse setting is false
```typescript
// src/config/transactionAllowList.ts
export const getTxAllowList = (): Array<TransactionAllow> => {
  return [
    {
      fromList: ['*'],
      toList: ['*'],
      webhooks: [
        {
          url: 'https://rpc.sandverse.oasys.games/',
          headers: { 
            host: 'rpc.sandverse.oasys.games',
            Authorization: 'Bearer xxxxxxxx',
          },
          timeout: 1000,
          retry: 3,
          parse: false,
        },
      ],
    },
  ];
};
```

```typescript
{
  // jsonrpc body is set
  method: 'eth_sendRawTransaction',
  params: [
    '0xf8c62780826b23945fbdb2315678afecb367f032d93f642f64180aa380b864a41368620000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000568656c6c6f000000000000000000000000000000000000000000000000000000829deda02c108533361ec243ad0d7f88c07165327c1b14ec64565edbbd50d7193399f0b8a071de69bb3d7cd3aa8697c0a459b2ccc29401d715135cb8a34d2d703b7cd77f47'
  ],
  id: 56,
  jsonrpc: '2.0',
  // meta is client information
  _meta: {
    ip: '::1',
    headers: {
      host: 'localhost:3001',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36'
    }
  }
}
```

In case that header is set Authorization and parse setting is true
```typescript
// src/config/transactionAllowList.ts
export const getTxAllowList = (): Array<TransactionAllow> => {
  return [
    {
      fromList: ['*'],
      toList: ['*'],
      webhooks: [
        {
          url: 'https://rpc.sandverse.oasys.games/',
          headers: {
            host: 'rpc.sandverse.oasys.games',
            Authorization: 'Bearer xxxxxxxx',
          },
          timeout: 1000,
          retry: 3,
          parse: true,
        },
      ],
    },
  ];
};
```

```typescript
{
  // parsed jsonrpc body is set
  nonce: 40,
  gasPrice: BigNumber { _hex: '0x00', _isBigNumber: true },
  gasLimit: BigNumber { _hex: '0x6b23', _isBigNumber: true },
  to: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  value: BigNumber { _hex: '0x00', _isBigNumber: true },
  data: '0xa41368620000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000568656c6c6f000000000000000000000000000000000000000000000000000000',
  chainId: 20197,
  v: 40429,
  r: '0x8a5a8f761bd45ba475b6b2a535a6d1a4d0941b657269b91ab19467e8a9d9d195',
  s: '0x11c0fb7057f3e18a6e01c324ff8a084abd369acc5289ab586c7f13b4ae88933d',
  from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  hash: '0x159625a3df0467d5be60adf105dfc5626294434f45d7f6ce4aeefbee9cedf383',
  type: null,
  // meta is client information
  _meta: {
    ip: '::1',
    headers: {
      host: 'localhost:3001',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36'
    }
  }
}
```