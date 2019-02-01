const prepareIoredis = require('./prepare-ioredis.js');
prepareIoredis();

const IORedis = require('ioredis');
const lodash = require('lodash');

const initScripts = require('./commands');
const { delay } = require('./common');

const defaults = require('./defaults');

class Producer {
  constructor(qname, { redisOptions } = {}) {
    this.redisOptions = lodash.merge({}, defaults.redisOptions, redisOptions);
    this.redis = new IORedis(this.redisOptions);

    this.QNAME = `${defaults.NAMESPACE}:queue:${qname}`;
    this.DEDUPSET = `${defaults.NAMESPACE}:queue:${qname}:dedupset`;

    this.redis.on('connect', this.initialize.bind(this));
  }

  async waitUntilInitialized() {
    while (!this.initialized) {
      await delay(50);
    }
  }

  async initialize() {
    await initScripts(this.redis);
    await delay(50); // Not sure if needed here. Does ioredis.defineCommand return a promise?

    this.initialized = true;
  }

  async addTask(data, dedupKey) {
    await this.waitUntilInitialized();

    await this.redis.enqueue(this.QNAME, this.DEDUPSET, JSON.stringify(data), dedupKey, 0);
  }

  addRepeatedTask(cron, producerFn) {
    // TODO: Implement
  }
}

module.exports = Producer;
