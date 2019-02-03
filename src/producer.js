const prepareIoredis = require('./prepare-ioredis.js');
prepareIoredis();

const IORedis = require('ioredis');
const lodash = require('lodash');

const initScripts = require('./commands');
const { delay } = require('./common');

const defaults = require('./defaults');

class Producer {
  constructor(qname, { redisOptions, redisClient } = {}) {
    if (redisClient) {
      this.redis = redisClient.duplicate();
    } else {
      this.redisOptions = lodash.merge({}, defaults.redisOptions, redisOptions);
      this.redis = new IORedis(this.redisOptions);
    }

    this.QNAME = `${defaults.NAMESPACE}:queue:${qname}`;
    this.DEDUPSET = `${defaults.NAMESPACE}:queue:${qname}:dedupset`;

    this._initialize();
  }

  async _waitUntilInitialized() {
    // TODO: Replace loop with an EventEmitter
    while (!this.initialized) {
      // console.log('Looping...');
      await delay(50);
    }
  }

  async _initialize() {
    await initScripts(this.redis);

    this.initialized = true;
  }

  async addTask(data, dedupKey) {
    await this._waitUntilInitialized();

    const retval = await this.redis.enqueue(this.QNAME, this.DEDUPSET, JSON.stringify(data), dedupKey, 0);
    return retval;
  }

  addCron(cron, producerFn) {
    // TODO: Implement
  }

  async _disconnect() {
    await this.redis.disconnect();
  }
}

module.exports = Producer;
