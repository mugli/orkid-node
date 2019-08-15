const lodash = require('lodash');
const ConsumerUnit = require('./consumer-unit');

const defaults = require('./defaults');

const { InvalidConfigError } = require('./errors');

class Consumer {
  constructor(qname, workerFn, options = {}) {
    this.consumerOptions = lodash.merge({}, defaults.consumerOptions, options.consumerOptions);
    this.concurrency = this.consumerOptions.concurrencyPerInstance;

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

module.exports = Consumer;
