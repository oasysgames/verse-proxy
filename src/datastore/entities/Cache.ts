export interface TransactionLimitStock {
  stock: number; // Number of stock secured from datastore
  counter: number; // Number of transactions that have been executed from createdAt
  isDatastoreLimit: boolean;
  createdAt: number;
}
