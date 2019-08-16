import * as lodash from 'lodash';
import { ConsumerUnit, ConsumerUnitOptions } from './consumer-unit';

import { defaultOptions, ConsumerOptions } from './defaults';

import { InvalidConfigError } from './errors';

export class Consumer {
  consumerOptions: ConsumerOptions;
  concurrency: number;
  consumers: ConsumerUnit[];

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
