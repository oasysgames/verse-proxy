import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VerseService } from './verse.service';
import { TransactionService } from './transaction.service';
import { JsonrpcRequestBody, JsonrpcError } from 'src/entities';
import { TypeCheckService } from './typeCheck.service';
import { DatastoreService } from 'src/repositories';

@Injectable()
export class CommunicateService {
  private isUseDatastore: boolean;
  private allowedMethods: RegExp[];

  constructor(
    private configService: ConfigService,
    private readonly typeCheckService: TypeCheckService,
    private verseService: VerseService,
    private readonly txService: TransactionService,
    private readonly datastoreService: DatastoreService,
  ) {
    this.isUseDatastore = !!this.configService.get<string>('datastore');
    this.allowedMethods = this.configService.get<RegExp[]>(
      'allowedMethods',
    ) ?? [/^.*$/];
  }

  async send(isUseReadNode: boolean, body: JsonrpcRequestBody) {
    try {
      const method = body.method;
      this.checkMethod(method);

      if (method === 'eth_sendRawTransaction') {
        return await this.sendTransaction(body);
      } else if (method === 'eth_estimateGas') {
        return await this.verseService.postVerseMasterNode({}, body);
      } else if (method === 'eth_subscribe' || method === 'eth_unsubscribe') {
        return;
      }

      if (isUseReadNode) {
        return await this.verseService.postVerseReadNode({}, body);
      } else {
        return await this.verseService.postVerseMasterNode({}, body);
      }
    } catch (err) {
      const status = 200;
      if (err instanceof JsonrpcError) {
        const data = {
          jsonrpc: body.jsonrpc,
          id: body.id,
          error: {
            code: err.code,
            message: err.message,
          },
        };
        console.error(err.message);
        return {
          status,
          data,
        };
      }
      console.error(err);
      return {
        status,
        data: err,
      };
    }
  }

  async sendTransaction(body: JsonrpcRequestBody) {
    const rawTx = body.params ? body.params[0] : undefined;
    if (!rawTx) throw new JsonrpcError('rawTransaction is not found', -32602);

    const tx = this.txService.parseRawTx(rawTx);

    if (!tx.from) throw new JsonrpcError('transaction is invalid', -32602);

    // contract deploy transaction
    if (!tx.to) {
      this.txService.checkContractDeploy(tx.from);
      await this.txService.checkAllowedGas(tx, body.jsonrpc, body.id);
      const result = await this.verseService.postVerseMasterNode({}, body);
      return result;
    }

    // transaction other than contract deploy
    const methodId = tx.data.substring(0, 10);
    const matchedTxAllowRule = await this.txService.getMatchedTxAllowRule(
      tx.from,
      tx.to,
      methodId,
      tx.value,
    );
    await this.txService.checkAllowedGas(tx, body.jsonrpc, body.id);
    const result = await this.verseService.postVerseMasterNode({}, body);

    if (!this.typeCheckService.isJsonrpcTxSuccessResponse(result.data))
      return result;
    const txHash = result.data.result;

    if (this.isUseDatastore && matchedTxAllowRule.rateLimit) {
      await this.datastoreService.setTransactionHistory(
        tx.from,
        tx.to,
        methodId,
        txHash,
        matchedTxAllowRule.rateLimit,
      );
    }
    return result;
  }

  checkMethod(method: string) {
    const checkMethod = this.allowedMethods.some((allowedMethod) => {
      return allowedMethod.test(method);
    });
    if (!checkMethod)
      throw new JsonrpcError(`${method} is not allowed`, -32601);
  }
}
