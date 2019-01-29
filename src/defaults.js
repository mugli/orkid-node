module.exports = {
  NAMESPACE: 'orkid',
  redisOptions: {},
  producerOptions: {
    deduplicate: false
  },
  consumerOptions: {
    workerFnTimeoutMs: 7 * 24 * 60 * 60 * 1000,
    taskBufferSize: 10,
    maxRetry: 0,
    concurrencyPerInstance: 1
  },
  loggingOptions: {
    enabled: true,
    loggerFn: console.log
  }
};
