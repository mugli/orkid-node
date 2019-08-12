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
      this._redis = redisClient.duplicate();
    } else {
      this._redisOptions = lodash.merge({}, defaults.redisOptions, redisOptions);
      this._redis = new IORedis(this._redisOptions);
    }

    this._QNAME = `${defaults.NAMESPACE}:queue:${qname}`;
    this._DEDUPSET = `${defaults.NAMESPACE}:queue:${qname}:dedupset`;

    this._initialize();
  }

  async _initialize() {
    await initScripts(this._redis);

    this._isInitialized = true;
  }

  async addTask(data, dedupKey) {
    await waitUntilInitialized(this, '_isInitialized');

    const retval = await this._redis.enqueue(this._QNAME, this._DEDUPSET, JSON.stringify(data), dedupKey, 0);
    return retval;
  }

  async _disconnect() {
    await this._redis.disconnect();
  }
}

module.exports = Producer;
