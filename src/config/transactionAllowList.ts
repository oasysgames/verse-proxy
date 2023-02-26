export interface ComparisonOperation {
  eq?: string; // txValue == condition is allowed
  nq?: string; // txValue != condition is allowed
  gt?: string; // txValue > condition is allowed
  gte?: string; // txValue >= condition is allowed
  lt?: string; // txValue < condition is allowed
  lte?: string; // txValue <= condition is allowed
}

export interface RateLimit {
  perFrom?: boolean;
  perTo?: boolean;
  perMethod?: boolean;
  interval: number;
  limit: number;
}

export interface RateLimitRule {
  fromList: Array<string>;
  toList: Array<string>;
  rateLimit: RateLimit;
}

export interface TransactionAllow {
  fromList: Array<string>;
  toList: Array<string>;
  value?: ComparisonOperation;
}

export const getTxAllowList = (): Array<TransactionAllow> => {
  return [
    {
      fromList: ['*'],
      toList: ['*'],
    },
  ];
};

export const getDeployAllowList = (): Array<string> => {
  return [''];
};

export const getUnlimitedTxRateAddresses = (): Array<string> => {
  return [''];
};

export const getRateLimitRules = (): Array<RateLimitRule> => {
  return [];
};
