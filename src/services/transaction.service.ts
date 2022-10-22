import { Injectable, ForbiddenException } from '@nestjs/common';
import { ethers, BigNumber, Transaction } from 'ethers';
import { TransactionAllow, EthEstimateGasParams } from 'src/shared/entities';
import { AllowCheckService } from 'src/shared/services/src';
import { getTxAllowList } from 'src/config/transactionAllowList';
import { VerseService } from './verse.service';

@Injectable()
export class TransactionService {
  private txAllowList: Array<TransactionAllow>;
  constructor(
    private verseService: VerseService,
    private allowCheckService: AllowCheckService,
  ) {
    this.txAllowList = getTxAllowList();
  }

  checkAllowedTx(tx: Transaction): void {
    const from = tx.from;
    const to = tx.to;
    const value = tx.value;

    if (!from) throw new ForbiddenException('transaction is invalid');

    // Check for deploy transactions
    if (!to) {
      if (this.allowCheckService.isAllowedDeploy(from)) {
        return;
      } else {
        throw new ForbiddenException('deploy transaction is not allowed');
      }
    }

    // Check for transactions other than deploy
    let isAllow = false;
    for (const condition of this.txAllowList) {
      const fromCheck = this.allowCheckService.isAllowedFrom(condition, from);
      const toCheck = this.allowCheckService.isAllowedTo(condition, to);

      const valueCondition = condition.value;
      const valueCheck = valueCondition
        ? this.allowCheckService.isAllowedValue(valueCondition, value)
        : true;

      if (fromCheck && toCheck && valueCheck) {
        isAllow = true;
        break;
      }
    }

    if (!isAllow) throw new ForbiddenException('transaction is not allowed');
    return;
  }

  async checkAllowedGas(
    tx: Transaction,
    jsonrpc: string,
    id: number,
  ): Promise<void> {
    const ethCallParams: EthEstimateGasParams = {
      nonce: ethers.utils.hexValue(BigNumber.from(tx.nonce)),
      gas: ethers.utils.hexValue(tx.gasLimit),
      value: ethers.utils.hexValue(tx.value),
      input: tx.data,
      chainId: ethers.utils.hexValue(BigNumber.from(tx.chainId)),
    };

    if (tx.type)
      ethCallParams['type'] = ethers.utils.hexValue(BigNumber.from(tx.type));
    if (tx.from) ethCallParams['from'] = tx.from;
    if (tx.to) ethCallParams['to'] = tx.to;
    if (tx.gasPrice)
      ethCallParams['gasPrice'] = ethers.utils.hexValue(tx.gasPrice);
    if (tx.maxPriorityFeePerGas)
      ethCallParams['maxPriorityFeePerGas'] = ethers.utils.hexValue(
        tx.maxPriorityFeePerGas,
      );
    if (tx.maxFeePerGas)
      ethCallParams['maxFeePerGas'] = ethers.utils.hexValue(tx.maxFeePerGas);
    if (tx.accessList) ethCallParams['accessList'] = tx.accessList;

    const params = [ethCallParams];
    const headers = {};
    const body = {
      jsonrpc: jsonrpc,
      id: id,
      method: 'eth_estimateGas',
      params: params,
    };

    const { data } = await this.verseService.post(headers, body);
    if (data.error) {
      throw new ForbiddenException(data.error.message);
    }
  }

  parseRawTx(rawTx: string): ethers.Transaction {
    return ethers.utils.parseTransaction(rawTx);
  }
}
