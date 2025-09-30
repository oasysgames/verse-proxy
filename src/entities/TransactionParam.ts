import type { AccessList } from 'ethers';

export interface EthEstimateGasParams {
  type?: string;
  nonce: string;
  from?: string;
  to?: string;
  gas: string;
  value: string;
  data: string;
  gasPrice?: string;
  maxPriorityFeePerGas?: string;
  maxFeePerGas?: string;
  accessList?: AccessList;
  chainId: string;
}
