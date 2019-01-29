const { config } = require('./config');
const constants = require('./const');

const IORedis = require('ioredis');

class Producer {
  constructor(qname, options) {
    this.redis = new IORedis();
    this.QNAME = `${constants.NAMESPACE}:${qname}`;
  }

  addTask(data) {
    return this.redis.xadd(this.QNAME, '*', 'data', JSON.stringify(data));
  }
}

module.exports = Producer;
