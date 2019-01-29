const IORedis = require('ioredis');
const lodash = require('lodash');

const {
  options: { redis }
} = require('./options').getOptions();
const defaults = require('./defaults');

class Producer {
  constructor(qname, options) {
    this.options = lodash.merge({}, defaults.producer, options);
    this.redis = new IORedis(redis);
    this.QNAME = `${defaults.NAMESPACE}:${qname}`;
  }

  addTask(data, dedupKey) {
    return this.redis.xadd(this.QNAME, '*', 'data', JSON.stringify(data), 'dedupKey', dedupKey);
  }

  addRepeatedTask(cron, producerFn) {}

  disconnect() {
    // TODO: Implement
  }

  connect() {
    // TODO: Implement
  }
}

module.exports = Producer;
