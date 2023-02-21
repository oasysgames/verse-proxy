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

type AllowedAddressList = {
  allowList: Array<string>;
  deniedList?: never;
};
type DeniedAddressList = {
  allowList?: never;
  deniedList: Array<string>;
};

export type AddressRestriction = AllowedAddressList | DeniedAddressList;

export interface TransactionAllow {
  fromList: AddressRestriction;
  toList: AddressRestriction;
  value?: ComparisonOperation;
  contractMethodList?: string[];
  webhooks?: Array<Webhook>;
}

export const getTxAllowList = (): Array<TransactionAllow> => {
  return [
    {
      fromList: { allowList: ['*'] },
      toList: { allowList: ['*'] },
    },
  ];
};

export const getDeployAllowList = (): AddressRestriction => {
  return { allowList: [''] };
};
