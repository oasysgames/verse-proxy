# Transaction access rate limit

## Datastore setting
For setting datastore to store transaction history, you have to set datastore environment variables.

```bash
# In case of redis
RATE_LIMIT_PLUGIN=redis
REDIS_URI=<REDIS_URI> # e.g. redis://localhost:6379/0
```

And please set expire as the period of time to store the transaction.

## Rate limit setting
Using `txAllowList` at `src/config/transactionAllowList.ts`, you can set transaction rate limit.
Please define rateLimit variable and set `txAllowList`.

```typescript
const rateLimitA = {
  name: 'wildcard',
  interval: 86400,
  limit: 1000,
};

const txAllowList: Array<TransactionAllow> = [
  {
    fromList: ['*'],
    toList: ['*'],
    rateLimit: rateLimitA,
  },
];
```

| RateLimit key  |  Description | Required |
| ---- | ---- | ---- |
|  name  |  RateLimit setting name. Must be unique.  | O |
|  perFrom  |  Whether the setting is restricted for each from set in fromList or not  | |
|  perTo  |  Whether the setting is restricted for each to set in the toList or not  | |
|  perMethod  |  Whether the setting is restricted for each contract method or not  | |
|  interval  |  Rate limit interval(seconds)  | O |
|  limit  |  Number of tx's allowed in the interval  | O |

rateLimit can be shared by another txAllowList setting.

```typescript
const rateLimitA = {
  name: 'wildcard',
  perFrom: true,
  perTo: true,
  interval: 86400,
  limit: 1,
};

const txAllowList: Array<TransactionAllow> = [
  {
    fromList: ['*'],
    toList: ['0x9809d9d94b0b3380db38b1e1a06047a2964e0041'],
    rateLimit: rateLimitA,
  },
  {
    fromList: ['*'],
    toList: ['0x40bde52e6b80ae11f34c58c14e1e7fe1f9c834c4'],
    rateLimit: rateLimitA,
  },
];
```

### Example(limit settings per user)
Each user can perform a transaction to `0x9809d9d94b0b3380db38b1e1a06047a2964e0041` once every 60 seconds.

```typescript
const rateLimitA = {
  name: 'wildcard',
  perFrom: true,
  interval: 60,
  limit: 1,
};

const txAllowList: Array<TransactionAllow> = [
  {
    fromList: ['*'],
    toList: ['0x9809d9d94b0b3380db38b1e1a06047a2964e0041'],
    rateLimit: rateLimitA,
  },
]
```

### Example(limit settings per all users)
Transaction to `0x9809d9d94b0b3380db38b1e1a06047a2964e0041` can only be executed once every 60 seconds

```typescript
const rateLimitA = {
  name: 'wildcard',
  interval: 60,
  limit: 1,
};

const txAllowList: Array<TransactionAllow> = [
  {
    fromList: ['*'],
    toList: ['0x9809d9d94b0b3380db38b1e1a06047a2964e0041'],
    rateLimit: rateLimitA,
  },
];
```

### Example(limit settings per contract)
Transaction to `0x9809d9d94b0b3380db38b1e1a06047a2964e0041` or `0x40bde52e6b80ae11f34c58c14e1e7fe1f9c834c4` can only be executed once every 60 seconds respectively.
```typescript
const rateLimitA = {
  name: 'wildcard',
  perTo: true,
  interval: 60,
  limit: 1,
};

const txAllowList: Array<TransactionAllow> = [
  {
    fromList: ['*'],
    toList: ['0x9809d9d94b0b3380db38b1e1a06047a2964e0041'],
    rateLimit: rateLimitA,
  },
  {
    fromList: ['*'],
    toList: ['0x40bde52e6b80ae11f34c58c14e1e7fe1f9c834c4'],
    rateLimit: rateLimitA,
  },
];
```

### Example(limit settings per all contracts)
Both together, Transaction to `0x9809d9d94b0b3380db38b1e1a06047a2964e0041` or `0x40bde52e6b80ae11f34c58c14e1e7fe1f9c834c4` can only be executed once every 60 seconds.

```typescript
const rateLimitA = {
  name: 'wildcard',
  interval: 60,
  limit: 1,
};

const txAllowList: Array<TransactionAllow> = [
  {
    fromList: ['*'],
    toList: ['0x9809d9d94b0b3380db38b1e1a06047a2964e0041'],
    rateLimit: rateLimitA,
  },
  {
    fromList: ['*'],
    toList: ['0x40bde52e6b80ae11f34c58c14e1e7fe1f9c834c4'],
    rateLimit: rateLimitA,
  },
];
```

## Set Addresses unlimited tx rate
Addresses set in `getDeployAllowList` and `getUnlimitedTxRateAddresses` are not rate-limited for transactions.

```typescript
const deployAllowList: Array<string> = ['0xaf395754eB6F542742784cE7702940C60465A46c'];

const unlimitedTxRateAddresses: Array<string> = ['0xaf395754eB6F542742784cE7702940C60465A46a'];
```

You can set wildcard
```typescript
const deployAllowList: Array<string> = ['*'];

const unlimitedTxRateAddresses: Array<string> = ['*'];
```