const prepareIoredis = require('./prepare-ioredis.js');
prepareIoredis();

const IORedis = require('ioredis');
const lodash = require('lodash');

const initScripts = require('./commands');
const { waitUntilInitialized } = require('./common');

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

  async _initialize() {
    await initScripts(this.redis);

    this.isInitialized = true;
  }

  async addTask(data, dedupKey) {
    await waitUntilInitialized(this.isInitialized);

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
