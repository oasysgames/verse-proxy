export interface ComparisonOperation {
  eq?: string; // txValue == condition is allowed
  nq?: string; // txValue != condition is allowed
  gt?: string; // txValue > condition is allowed
  gte?: string; // txValue >= condition is allowed
  lt?: string; // txValue < condition is allowed
  lte?: string; // txValue <= condition is allowed
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
  rateLimit?: RateLimit;
}

const txAllowList: Array<TransactionAllow> = [
  {
    fromList: ['*'],
    toList: ['*'],
  },
];

const deployAllowList: Array<string> = [''];

const unlimitedTxRateAddresses: Array<string> = [''];

const checkAddressList = (addressList: Array<string>) => {
  if (addressList.includes('*')) {
    if (addressList.length !== 1)
      throw new Error('You can not set wildcard with another address');
    return;
  }

  let isAllow: boolean;
  const firstAddress = addressList[0];

  if (firstAddress[0] === '!') {
    isAllow = addressList.every((address) => {
      return address[0] === '!';
    });
  } else {
    isAllow = addressList.every((address) => {
      return address[0] !== '!';
    });
  }

  if (!isAllow)
    throw new Error(
      'You can not set setting with address and address_denial(!address)',
    );
};

export const getTxAllowList = (): Array<TransactionAllow> => {
  txAllowList.forEach((txAllow) => {
    checkAddressList(txAllow.fromList);
    checkAddressList(txAllow.toList);
  });

  return txAllowList;
};

export const getDeployAllowList = (): Array<string> => {
  checkAddressList(deployAllowList);
  return deployAllowList;
};

export const getUnlimitedTxRateAddresses = (): Array<string> => {
  checkAddressList(unlimitedTxRateAddresses);
  return unlimitedTxRateAddresses;
};
