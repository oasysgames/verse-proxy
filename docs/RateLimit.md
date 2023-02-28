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
Using `getRateLimitRules` at `src/config/transactionAllowList.ts`, you can set transaction rate limit.

```typescript
export const getRateLimitRules = (): Array<RateLimitRule> => {
  return [
    {
      fromList: ['*'],
      toList: ['*'],
      rateLimit: {
        perFrom: true,
        perTo: true,
        perMethod: true,
        interval: 60,
        limit: 1,
      },
    },
  ];
};
```

| key  |  Description | Required |
| ---- | ---- | ---- |
|  fromList  |  List of user addresses for rate limiting. You can set multiple addresses and wildcard.  | O |
|  toList  |  List of contract addresses for rate limiting. You can set multiple addresses and wildcard.  | O |
|  rateLimit.perFrom  |  Whether the setting is restricted for each from set in fromList or not  | |
|  rateLimit.perTo  |  Whether the setting is restricted for each to set in the toList or not  | |
|  rateLimit.perMethod  |  Whether the setting is restricted for each contract method or not  | |
|  rateLimit.interval  |  Rate limit interval(seconds)  | O |
|  rateLimit.limit  |  Number of tx's allowed in the interval  | O |

You can not set setting that only perMethod is `true`.
```typescript
export const getRateLimitRules = (): Array<RateLimitRule> => {
  return [
    {
      fromList: ['*'],
      toList: ['*'],
      rateLimit: {
        perFrom: false,
        perTo: false,
        perMethod: true,
        interval: 60,
        limit: 1,
      },
    },
  ];
};
```

### Example(limit settings per user)
Each user can perform a transaction to `0xaf395754eB6F542742784cE7702940C60465A46c` once every 60 seconds.

```typescript
export const getRateLimitRules = (): Array<RateLimitRule> => {
  return [
    {
      fromList: ['*'],
      toList: ['0xaf395754eB6F542742784cE7702940C60465A46c'],
      rateLimit: {
        perFrom: true,
        perTo: false,
        perMethod: false,
        interval: 60,
        limit: 1,
      },
    },
  ];
};
```

### Example(limit settings per all users)
Transaction to `0xaf395754eB6F542742784cE7702940C60465A46c` can only be executed once every 60 seconds

```typescript
export const getRateLimitRules = (): Array<RateLimitRule> => {
  return [
    {
      fromList: ['*'],
      toList: ['0xaf395754eB6F542742784cE7702940C60465A46c'],
      rateLimit: {
        perFrom: false,
        perTo: false,
        perMethod: false,
        interval: 60,
        limit: 1,
      },
    },
  ];
};
```

### Example(limit settings per contract)
`0xaf395754eB6F542742784cE7702940C60465A46c` can only perform a transaction to the same contract once every 60 seconds.
```typescript
export const getRateLimitRules = (): Array<RateLimitRule> => {
  return [
    {
      fromList: ['0xaf395754eB6F542742784cE7702940C60465A46c'],
      toList: ['*'],
      rateLimit: {
        perFrom: false,
        perTo: true,
        perMethod: false,
        interval: 60,
        limit: 1,
      },
    },
  ];
};
```

### Example(limit settings per all contracts)
`0xaf395754eB6F542742784cE7702940C60465A46c` can perform a transaction once every 60 seconds

```typescript
export const getRateLimitRules = (): Array<RateLimitRule> => {
  return [
    {
      fromList: ['0xaf395754eB6F542742784cE7702940C60465A46c'],
      toList: ['*'],
      rateLimit: {
        perFrom: false,
        perTo: false,
        perMethod: false,
        interval: 60,
        limit: 1,
      },
    },
  ];
};
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