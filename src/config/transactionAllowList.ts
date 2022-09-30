import { TransactionAllow } from 'src/shared/entities';

const getTxAllowList = (): Array<TransactionAllow> => {
  return [
    {
      fromList: ['*'],
      toList: ['*'],
    },
  ];
};

export default getTxAllowList;
