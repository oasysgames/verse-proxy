export interface ComparisonOperation {
  eq?: string; // txValue == condition is allowed
  nq?: string; // txValue != condition is allowed
  gt?: string; // txValue > condition is allowed
  gte?: string; // txValue >= condition is allowed
  lt?: string; // txValue < condition is allowed
  lte?: string; // txValue <= condition is allowed
}

export interface Webhook {
  url: string;
  headers: {
    [name: string]: string;
    host: string;
  };
  timeout: number;
  retry: number;
  parse: boolean;
}
export interface RateLimit {
  name: string;
  perFrom?: boolean;
  perTo?: boolean;
  perMethod?: boolean;
  interval: number;
  limit: number;
}

export interface TransactionAllow {
  fromList: Array<string>;
  toList: Array<string>;
  value?: ComparisonOperation;
  contractMethodList?: string[];
  webhooks?: Array<Webhook>;
  rateLimit?: RateLimit;
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
  return ['*'];
};

export const getUnlimitedTxRateAddresses = (): Array<string> => {
  return [''];
};
