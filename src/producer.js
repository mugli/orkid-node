const prepareIoredis = require('./prepare-ioredis.js');
prepareIoredis();

const IORedis = require('ioredis');
const lodash = require('lodash');

const defaults = require('./defaults');

class Producer {
  constructor(qname, { redisOptions } = {}) {
    this.redisOptions = lodash.merge({}, defaults.redisOptions, redisOptions);
    this.redis = new IORedis(this.redisOptions);
    this.QNAME = `${defaults.NAMESPACE}:queue:${qname}`;
  }

  addTask(data, dedupKey) {
    // TODO: Implement dedupKey functionality (add to redis set SADD, if successful, add to STREAM)
    // After processing is done/failed in consumer, also remove from the set if dedupKey is present
    // in task
    //
    // We also need to execute a Lua script during initization phase to make sure the set doesn't have
    // any items in it that's not present in the stream (orphan item)
    //
    return this.redis.xadd(this.QNAME, '*', 'data', JSON.stringify(data), 'dedupKey', dedupKey);
  }

  addRepeatedTask(cron, producerFn) {}
}

module.exports = Producer;
