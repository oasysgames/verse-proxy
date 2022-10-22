import { ethers } from 'ethers';

export interface EthEstimateGasParams {
  type?: string;
  nonce: string;
  from?: string;
  to?: string;
  gas: string;
  value: string;
  input: string;
  gasPrice?: string;
  maxPriorityFeePerGas?: string;
  maxFeePerGas?: string;
  accessList?: ethers.utils.AccessList;
  chainId: string;
}
