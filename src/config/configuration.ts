export default () => ({
  verseMasterNodeUrl:
    process.env.VERSE_MASTER_NODE_URL ||
    process.env.VERSE_URL ||
    'http://localhost:8545',
  verseReadNodeUrl: process.env.VERSE_READ_NODE_URL,
  blockNumberCacheExpireSec: process.env.BLOCK_NUMBER_CACHE_EXPIRE_SEC
    ? parseInt(process.env.BLOCK_NUMBER_CACHE_EXPIRE_SEC, 10)
    : undefined,
  isUseDatastore: !!process.env.REDIS_URI || !!process.env.RDB_URI,
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
