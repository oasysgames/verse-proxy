import { Injectable, ForbiddenException } from '@nestjs/common';
import { ethers, BigNumber, Transaction } from 'ethers';
import { TransactionAllow } from 'src/shared/entities';
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
    const type = tx.type
      ? ethers.utils.hexValue(BigNumber.from(tx.type))
      : undefined;
    const nonce = ethers.utils.hexValue(BigNumber.from(tx.nonce));
    const from = tx.from;
    const to = tx.to;
    const gas = ethers.utils.hexValue(tx.gasLimit);
    const value = ethers.utils.hexValue(tx.value);
    const input = tx.data;
    const gasPrice = tx.gasPrice
      ? ethers.utils.hexValue(tx.gasPrice)
      : undefined;
    const maxPriorityFeePerGas = tx.maxPriorityFeePerGas
      ? ethers.utils.hexValue(tx.maxPriorityFeePerGas)
      : undefined;
    const maxFeePerGas = tx.maxFeePerGas
      ? ethers.utils.hexValue(tx.maxFeePerGas)
      : undefined;
    const accessList = tx.accessList;
    const chainId = ethers.utils.hexValue(BigNumber.from(tx.chainId));

    const params = [
      {
        type,
        nonce,
        from,
        to,
        gas,
        value,
        input,
        gasPrice,
        maxPriorityFeePerGas,
        maxFeePerGas,
        accessList,
        chainId,
      },
      'latest',
    ];
    const headers = {};
    const body = {
      jsonrpc: jsonrpc,
      id: id,
      method: 'eth_call',
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
