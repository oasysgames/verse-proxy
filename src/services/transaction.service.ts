import { Injectable, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom, map } from 'rxjs';
import { ethers, BigNumber, Transaction } from 'ethers';
import { TransactionAllow } from 'src/shared/entities';
import { AllowCheckService } from 'src/shared/services/src';
import getTxAllowList from 'src/config/transactionAllowList';

@Injectable()
export class TransactionService {
  private txAllowList: Array<TransactionAllow>;
  constructor(
    private readonly httpService: HttpService,
    private configService: ConfigService,
    private allowCheckService: AllowCheckService,
  ) {
    this.txAllowList = getTxAllowList();
  }

  checkAllowedTx(tx: Transaction): void {
    const from = tx.from;
    const to = tx.to;
    const value = tx.value;

    if (!from || !to) throw new ForbiddenException('transaction is invalid');

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
    const type = BigNumber.from(tx.type).toHexString();
    const nonce = BigNumber.from(tx.nonce).toHexString();
    const from = tx.from;
    const to = tx.to;
    const gas = tx.gasLimit.toHexString();
    const value = tx.value.toHexString();
    const input = tx.data;
    const gasPrice = tx.gasPrice?.toHexString();
    const maxPriorityFeePerGas = tx.maxPriorityFeePerGas?.toHexString();
    const maxFeePerGas = tx.maxFeePerGas?.toHexString();
    const accessList = tx.accessList;
    const chainId = BigNumber.from(tx.chainId).toHexString();

    const verseUrl =
      this.configService.get<string>('verseUrl') ?? 'http://localhost:8545';
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
    const body = {
      jsonrpc: jsonrpc,
      id: id,
      method: 'eth_call',
      params: params,
    };

    const res = await lastValueFrom(
      this.httpService.post(verseUrl, body).pipe(map((res) => res.data)),
    );
    if (res.error) {
      throw new ForbiddenException(res.error.message);
    }
  }

  parseRawTx(rawTx: string): ethers.Transaction {
    return ethers.utils.parseTransaction(rawTx);
  }
}
