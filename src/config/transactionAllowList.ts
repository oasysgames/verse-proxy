export interface ComparisonOperation {
  eq?: string; // txValue == condition is allowed
  nq?: string; // txValue != condition is allowed
  gt?: string; // txValue > condition is allowed
  gte?: string; // txValue >= condition is allowed
  lt?: string; // txValue < condition is allowed
  lte?: string; // txValue <= condition is allowed
}

export type ContractList = { [contractAddress: string]: string[] };

export interface Webhook {
  url: string;
  headers?: { [name: string]: string };
  timeout: number;
  retry: number;
  parse: boolean;
}

export interface TransactionAllow {
  fromList: Array<string>;
  toList: Array<string>;
  value?: ComparisonOperation;
  contractList?: ContractList;
  webhooks?: Array<Webhook>;
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
