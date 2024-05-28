# Verse-Proxy

This is proxy to control access allow list to verse layer.  
Verse-Proxy is made by [Nest](https://github.com/nestjs/nest).  

Verse-Proxy can control following items.  
- jsonrpc method
- transaction's from, to, value
- address which can deploy smart contract
- transaction access rate

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

### 3. Set configuration variables

- Create file `.env` refer to `.env.example`
- Update those variables with corrected values from your side

### 4. Set up redis server

- Verse-Proxy use redis as a database to read and write data, so in order to run this proxy you will need start a redis server and pass url to `REDIS_URI`
- also Verse-Proxy need to know which database you would use which can be config using `DATASTORE`

For example: 

```env
DATASTORE=redis
REDIS_URI=redis://localhost:6379
```

### 5. Handle disconnect from node's websocket

- `MAXRECONNECTATTEMPTS` specifies the maximum number of attempts the Verse-proxy will make to reconnect to a node's websocket.

**example**: 

```env
MAXRECONNECTATTEMPTS=10
```

### 6. Set up npm

```bash
$ npm install
$ npm build
```

### 6. Run app

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

#### 1. Set Environment Variables

```bash
export PORT=[YOUR_PROXY_PORT]
export VERSE_MASTER_NODE_URL=[YOUR_VERSE_HTTP_URL]
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

### Set allowed header

You can set whether you inherit proxy request's host header on verse request at `src/config/configuration.ts`.

```typescript
inheritHostHeader: true,
```

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
- It prohibits the methods of executing a transaction with the authority of verse-geth (e.g., `eth_sendTransaction`)

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
};
```

```typescript
// '!' is exception pattern.
// 0xaf395754eB6F542742784cE7702940C60465A46a are not allowed to be transacted.
// But any address other than 0xaf395754eB6F542742784cE7702940C60465A46a are allowed to be transacted.
export const getTxAllowList = (): Array<TransactionAllow> => {
  return [
    {
      fromList: ['!0xaf395754eB6F542742784cE7702940C60465A46a'],
      toList: ['*'],
    },
  ];
};

// Everyone are not allowed to transact to 0xaf395754eB6F542742784cE7702940C60465A46a.
// Everyone are allowed to transact to any address other than 0xaf395754eB6F542742784cE7702940C60465A46a.
export const getTxAllowList = (): Array<TransactionAllow> => {
  return [
    {
      fromList: ['*'],
      toList: ['!0xaf395754eB6F542742784cE7702940C60465A46a'],
    },
  ];
};

// Multiple settings are enabled.
// Everyone are not allowed to transact to 0xaf395754eB6F542742784cE7702940C60465A46a and 0xaf395754eB6F542742784cE7702940C60465A46c.
// Everyone are allowed to transact to any address other than 0xaf395754eB6F542742784cE7702940C60465A46a and 0xaf395754eB6F542742784cE7702940C60465A46c.
export const getTxAllowList = (): Array<TransactionAllow> => {
  return [
    {
      fromList: ['*'],
      toList: [
        '!0xaf395754eB6F542742784cE7702940C60465A46a',
        '!0xaf395754eB6F542742784cE7702940C60465A46c'
      ],
    },
  ];
};
```

```typescript
// You cannot set settings with normal address and exception pattern.
export const getTxAllowList = (): Array<TransactionAllow> => {
  return [
    {
      fromList: ['*'],
      toList: [
        '0xaf395754eB6F542742784cE7702940C60465A46a',
        '!0xaf395754eB6F542742784cE7702940C60465A46c'
      ],
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

#### Value (Option)

You can control the token value of a transaction.

```typescript
// Only transactions with more than 1000000000000000000 unit values are allowed.
export const getTxAllowList = (): Array<TransactionAllow> => {
  return [
    {
      fromList: ['*'],
      toList: ['*'],
      value: { gt: '1000000000000000000' },
    },
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

#### Transaction access rate limit (Option)

If you set transaction access rate limit, follow [Transaction access rate limit](/docs/

RateLimit.md).  
If you want to deny all transaction access, set `false`.

### Deploy allow list

You can control who can deploy contract.

```typescript
// Only addresses contained in the array are allowed to deploy contract.
export const getDeployAllowList = (): Array<string> => {
  return ['0xaf395754eB6F542742784cE7702940C60465A46a'];
};
```

```typescript
// '*' is wildcard.
export const getDeployAllowList = (): Array<string> => {
  return ['*'];
};
```

```typescript
// '!' is exception pattern.
// 0xaf395754eB6F542742784cE7702940C60465A46a are not allowed to deploy contract.
// But any address other than 0xaf395754eB6F542742784cE7702940C60465A46a are allowed to deploy contract.
export const getDeployAllowList = (): Array<string> => {
  return ['!0xaf395754eB6F542742784cE7702940C60465A46a'];
};
```

### Handle large batch request

You can set the body parser size limit by configuring MAX_BODY_BYTE_SIZE in `.env` to handle large batch requests.  
Default is 1mb.

```env
MAX_BODY_BYTE_SIZE=1048576 # 1MB
```

### Set worker processes

You can set the number of worker processes to use.  
Default is 1.  
When setting the number of worker processes, make sure you have a sufficient server resource, otherwise it will affect the performance.  
Setting the value too high may cause resource exhaustion and crashes.

```env
CLUSTER_PROCESS=4
```

### Set master and read nodes

Verse-proxy supports master and read nodes to distribute the load.

```env
VERSE_MASTER_NODE_URL=[YOUR_VERSE_URL]
VERSE_READ_NODE_URL=[YOUR_VERSE_REPLICA_URL]
```

#### Request to master node endpoint

The master node endpoint is `/master`.  
To send requests to the master node, the request endpoint should be `/master`.

## Reduce MetaMask Access

MetaMask makes a lot of requests for block number information in order to always show the latest information.  
To reduce access, we cache the block number information for a certain amount of time.  
For detailed information, refer to [Reduce MetaMask Access](/docs/MetamaskAccess.md).