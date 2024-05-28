export default () => ({
  verseMasterNodeUrl:
    process.env.VERSE_MASTER_NODE_URL ||
    process.env.VERSE_URL ||
    'http://localhost:8545',
  verseReadNodeUrl: process.env.VERSE_READ_NODE_URL,
  verseWSUrl: process.env.VERSE_WS_URL,
  blockNumberCacheExpire: process.env.BLOCK_NUMBER_CACHE_EXPIRE_SEC
    ? parseInt(process.env.BLOCK_NUMBER_CACHE_EXPIRE_SEC, 10)
    : undefined,
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
  maxBodySize: parseInt(process.env.MAX_BODY_BYTE_SIZE || '524288', 10),
  wsMethods: /^eth_(subscribe|unsubscribe)$/,
  wsGCInterval: parseInt(process.env.WS_GC_INTERVAL || '60000', 10),
});
