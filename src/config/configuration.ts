export default () => ({
  verseUrl: process.env.VERSE_URL ?? 'http://localhost:8545',
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
  // inheritHostHeader: true,
});
