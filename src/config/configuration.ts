export default () => ({
  verseUrl: process.env.VERSE_URL ?? 'http://localhost:8545',
  allowedMethods: /^eth_(get.*|sendRawTransaction)$/,
});
