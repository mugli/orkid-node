// TODO: Add docs for options and defaults

import * as IORedis from 'ioredis';

const redisOptions: IORedis.RedisOptions = {};

export interface QueueOptions {
  maxIndividualQueueResultSize?: number;
  maxResultListSize?: number;
  maxFailedListSize?: number;
  maxDeadListSize?: number;
}

const queueOptions: QueueOptions = {
  // Currently there is no API to override these defaults
  maxIndividualQueueResultSize: 10_000,
  maxResultListSize: 100_000,
  maxFailedListSize: 100_000,
  maxDeadListSize: 100_000
};

export interface ConsumerOptions {
  workerFnTimeoutMs?: number;
  taskBufferSize?: number;
  maxRetry?: number;
  concurrencyPerInstance?: number;
}

const consumerOptions: ConsumerOptions = {
  workerFnTimeoutMs: 24 * 60 * 60 * 1000,
  taskBufferSize: 10,
  maxRetry: 0,
  concurrencyPerInstance: 1
};

export interface LoggingOptions {
  enabled?: boolean;
  loggerFn?(message?: any, ...optionalParams: any[]): void;
}

const loggingOptions: LoggingOptions = {
  enabled: false,
  loggerFn: console.log
};

export const defaultOptions = {
  NAMESPACE: '__orkid',
  RESULTLIST: '__orkid:internals:results',
  FAILEDLIST: '__orkid:internals:failed',
  DEADLIST: '__orkid:internals:dead',
  STAT: '__orkid:internals:stat',
  QUENAMES: '__orkid:internals:qnames',
  redisOptions,
  queueOptions,
  consumerOptions,
  loggingOptions
};
