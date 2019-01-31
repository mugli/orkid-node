module.exports = {
  NAMESPACE: 'orkid',
  RESULTLIST: 'orkid:internals:results',
  redisOptions: {},
  producerOptions: {
    deduplicate: false
  },
  queueOptions: {
    // Currently there is no API to override these defaults
    maxResultListSize: 1000
  },
  consumerOptions: {
    workerFnTimeoutMs: 24 * 60 * 60 * 1000,
    taskBufferSize: 10,
    maxRetry: 0,
    concurrencyPerInstance: 1
  },
  loggingOptions: {
    enabled: true,
    loggerFn: console.log
  }
};
