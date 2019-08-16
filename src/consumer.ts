import * as lodash from 'lodash';
import { ConsumerUnit, ConsumerUnitOptions } from './consumer-unit';

import { defaultOptions, ConsumerOptions } from './defaults';

import { InvalidConfigError } from './errors';

export class Consumer {
  consumerOptions: ConsumerOptions;
  concurrency: number;
  consumers: ConsumerUnit[];

  /**
   * Create a new Consumer for a queue
   * @param qname name of the queue.
   *
   * @param workerFn The function that will be called with data.
   *
   * @param options.redisClient Optional. redisClient is an instance of `ioredis`
   *    which will be used to duplicate configs to create a new redis connection.
   *
   *    `options.redisClient` is used over `options.redisOptions` if both are present.
   *
   * @param options.redisOptions Optional. Any valid `ioredis` options.
   *
   * @param options.consumerOptions.concurrencyPerInstance Optional. Concurrency per instance of
   *    Consumer class.
   *    Default: 1, means it will run 1 consumer per instance of Consumer.
   *
   * @param options.consumerOptions.maxRetry Optional. Maximum number to retry to if `workerFn` throws
   *    error or times out. Applicable to per instance of Consumer class.
   *    Default: 0, means it will not retry after failure/timeout and move the task to dead list.
   *
   * @param options.consumerOptions.workerFnTimeoutMs Optional. Maximum amount of time a workerFn is allowed to run
   *    before throwing TimeoutError. Applicable to per instance of Consumer class.
   *    Default: 24 hours converted to milliseconds.
   */
  constructor(qname: string, workerFn: Function, options: ConsumerUnitOptions = {}) {
    this.consumerOptions = lodash.merge({}, defaultOptions.consumerOptions, options.consumerOptions);
    this.concurrency = this.consumerOptions.concurrencyPerInstance as number;

    if (this.concurrency < 1) {
      throw new InvalidConfigError('Concurrency cannot be less than 1');
    }

    if (!workerFn || typeof workerFn !== 'function') {
      throw new Error('workerFn is required');
    }

    this.consumers = [];
    for (let i = 0; i < this.concurrency; i++) {
      const consumer = new ConsumerUnit(qname, workerFn, options);
      this.consumers.push(consumer);
    }
  }

  start() {
    for (let i = 0; i < this.concurrency; i++) {
      this.consumers[i].start();
    }
  }

  pause() {
    for (let i = 0; i < this.concurrency; i++) {
      this.consumers[i].pause();
    }
  }

  resume() {
    for (let i = 0; i < this.concurrency; i++) {
      this.consumers[i].resume();
    }
  }
}
