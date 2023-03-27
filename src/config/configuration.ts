export default () => ({
  verseMasterNodeUrl:
    process.env.VERSE_MASTER_NODE_URL ||
    process.env.VERSE_URL ||
    'http://localhost:8545',
  verseReadNodeUrl: process.env.VERSE_READ_NODE_URL,
  isUseBlockNumberCache: false,
  datastore: process.env.DATASTORE ?? '',
  allowedMethods: [
    /^net_version$/,
    /^web3_clientVersion$/,
    /^eth_get.*$/,
    /^eth_sendRawTransaction$/,
    /^eth_chainId$/,
    /^eth_blockNumber$/,
    /^eth_call$/,
    /^eth_estimateGas$/,
    /^eth_gasPrice$/,
    /^eth_maxPriorityFeePerGas$/,
    /^eth_feeHistory$/,
    /^eth_.*Filter$/,
  ],
  inheritHostHeader: true,
});
