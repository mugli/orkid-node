// TODO: Add docs for options and defaults

import * as IORedis from 'ioredis';

const redisOptions: IORedis.RedisOptions = {};

export interface QueueOptions {
  maxResultListSize?: number;
  maxFailedListSize?: number;
  maxDeadListSize?: number;
}

const queueOptions: QueueOptions = {
  // Currently there is no API to override these defaults
  maxResultListSize: 10000,
  maxFailedListSize: 100000,
  maxDeadListSize: 100000
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
  NAMESPACE: 'orkid',
  RESULTLIST: 'orkid:internals:results',
  FAILEDLIST: 'orkid:internals:failed',
  DEADLIST: 'orkid:internals:dead',
  STAT: 'orkid:internals:stat',
  QUENAMES: 'orkid:internals:qnames',
  redisOptions,
  queueOptions,
  consumerOptions,
  loggingOptions
};
