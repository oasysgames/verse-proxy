import { Transaction } from 'ethers';
import { JsonrpcRequestBody, RequestContext } from 'src/entities';

export interface WebhookTransferData {
  requestContext: RequestContext;
  body: JsonrpcRequestBody;
  tx: Transaction;
}
