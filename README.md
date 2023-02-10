# Verse-Proxy
This is proxy to control access allow list to verse layer.  
Verse-Proxy is made by [Nest](https://github.com/nestjs/nest).  

Verse-Proxy can control following items.  
- jsonrpc method
- transaction's from, to, value
- address which can deploy smart contract


## Verse Proxy Build Steps

### 1. Git clone
```bash
git clone git@github.com:oasysgames/verse-proxy.git
```

### 2. Set access allow list
Set access allow list at following file.  
Details are described later.
- `src/config/configuration.ts`
- `src/config/transactionAllowList.ts`

### 3. Set up npm
```bash
$ npm install
$ npm build
```

### 4. Run app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

### Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

### Deploy
#### 1. Set PORT
```bash
export PORT=[YOUR_PROXY_PORT]
```

#### 2. Set allow list config
You have to download your allow list config to `$PWD/src/config`.

#### 3. Start container
```bash
# chose image version and pull image
docker pull ghcr.io/oasysgames/verse-proxy:v1.0.0

# create container
docker run --name verse-proxy -d -p $PORT:$PORT -v $PWD/src/config:/usr/src/app/src/config verse-proxy
```

## Control items

### Set allowed verse request methods
You can set allowed verse request methods by regex at `src/config/configuration.ts`.
```typescript
allowedMethods: [
  /^net_version$/,
  /^web3_clientVersion$/,
  /^eth_get.*$/,
  /^eth_sendRawTransaction$/,
  /^eth_chainId$/,
  /^eth_blockNumber$/,
  /^eth_call$/,
  /^eth_estimateGas$/,
  /^eth_gasPrice$/,
  /^eth_maxPriorityFeePerGas$/,
  /^eth_feeHistory$/,
  /^eth_.*Filter$/,
],
```

Default allowedMethods feature are following.  
- It allows methods that may be requested by users
- It prohibits the methods of executing a transaction with the authority of verse-geth(e.g. eth_sendTransaction)

### Set transaction allow list
You can set allowed transaction list at `src/config/transactionAllowList.ts`.

#### from, to
You can control the from and to of a transaction.

```typescript
// elements contained in the array are allowed to be transacted.
export const getTxAllowList = (): Array<TransactionAllow> => {
  return [
    {
      fromList: ['0xaf395754eB6F542742784cE7702940C60465A46a'],
      toList: ['0xaf395754eB6F542742784cE7702940C60465A46a'],
    },
    {
      fromList: ['0xaf395754eB6F542742784cE7702940C60465A46c'],
      toList: ['0xaf395754eB6F542742784cE7702940C60465A46c'],
    },
  ];
};
```

```typescript
// '*' is wildcard.
export const getTxAllowList = (): Array<TransactionAllow> => {
  return [
    {
      fromList: ['*'],
      toList: ['*'],
    },
  ];
}
```

```typescript
// ! is denial.

// everyone are not allowed to transact to 0xaf395754eB6F542742784cE7702940C60465A46a.
export const getTxAllowList = (): Array<TransactionAllow> => {
  return [
    {
      fromList: ['*'],
      toList: ['!0xaf395754eB6F542742784cE7702940C60465A46a'],
    },
  ];
};

// 0xaf395754eB6F542742784cE7702940C60465A46a are not allowed to transact to all address.
export const getTxAllowList = (): Array<TransactionAllow> => {
  return [
    {
      fromList: ['!0xaf395754eB6F542742784cE7702940C60465A46a'],
      toList: ['*'],
    },
  ];
};
```

If you want to allow transacting factory and bridge contracts, please set those contract addresses to `to`.

```json
// Verse-Layer pre-deployed Contracts. Same address for all Verse-Layers.
L2StandardBridge: '0x4200000000000000000000000000000000000010',
L2StandardTokenFactory: '0x4200000000000000000000000000000000000012',
L2ERC721Bridge: '0x6200000000000000000000000000000000000001',
```

```typescript
export const getTxAllowList = (): Array<TransactionAllow> => {
  return [
    {
      fromList: [<FROM_YOU_WANT_TO_SET>],
      toList: [
        '0x4200000000000000000000000000000000000010',
        '0x4200000000000000000000000000000000000012',
        '0x6200000000000000000000000000000000000001',
      ],
    },
    ...
  ];
};
```

#### Contract(Option)
You cant restrict to transact contract method.

```typescript
// everyone can only transact to greet and setGreeting to 0x5FbDB2315678afecb367f032d93F642f64180aa3
export const getTxAllowList = (): Array<TransactionAllow> => {
  return [
    {
      fromList: ['*'],
      toList: ['0x5FbDB2315678afecb367f032d93F642f64180aa3'],
      contractList: {
        '0x5FbDB2315678afecb367f032d93F642f64180aa3': [
          'greet',
          'setGreeting(string)',
        ],
      },
    },
  ];
};
```

```typescript
// if contractList is {}, all transaction is allowed.
export const getTxAllowList = (): Array<TransactionAllow> => {
  return [
    {
      fromList: ['*'],
      toList: ['0x5FbDB2315678afecb367f032d93F642f64180aa3'],
      contractList: {},
    },
  ];
};
```

#### Value(Option)
You can control the token value of a transaction.

```typescript
// Only transactions with more than 1000000000000000000unit values are allowed.
export const getTxAllowList = (): Array<TransactionAllow> => {
  return [
    {
      fromList: ['*'],
      toList: ['*'],
      value: { gt: '1000000000000000000' },
    }
  ];
};
```

| value's key  |  Comparison Operation  |
| ---- | ---- |
|  eq  |  txValue == condition is allowed  |
|  nq  |  txValue != condition is allowed  |
|  gt  |  txValue > condition is allowed  |
|  gte  |  txValue >= condition is allowed  |
|  lt  |  txValue < condition is allowed  |
|  lte  |  txValue <= condition is allowed  |

#### Deployer
You can control deployer of a verse.

```typescript
// Only 0xaf395754eB6F542742784cE7702940C60465A46a can deploy
export const getDeployAllowList = (): Array<string> => {
  return ['0xaf395754eB6F542742784cE7702940C60465A46a'];
};

// Everyone can deploy
export const getDeployAllowList = (): Array<string> => {
  return ['*'];
};

// 0xaf395754eB6F542742784cE7702940C60465A46c cannot deploy,
// 0xaf395754eB6F542742784cE7702940C60465A46a can deploy
export const getDeployAllowList = (): Array<string> => {
  return [
    '!0xaf395754eB6F542742784cE7702940C60465A46c',
    '0xaf395754eB6F542742784cE7702940C60465A46a',
  ];
};
```

### Set allowed header
You can set whether you inherit proxy request's host header on verse request at `src/config/configuration.ts`.
```typescript
inheritHostHeader: true,
```
