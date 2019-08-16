import IORedis from 'ioredis';
import * as lodash from 'lodash';

import { initScripts, Redis } from './commands';
import { waitUntilInitialized } from './common';

import { defaultOptions } from './defaults';

export interface ProducerOptions {
  redisClient?: IORedis.Redis;

  redisOptions?: IORedis.RedisOptions;
}

export class Producer {
  _redis: Redis;
  _QNAME: string;
  _DEDUPSET: string;
  _isInitialized: boolean = false;
  _redisOptions: IORedis.RedisOptions = defaultOptions.redisOptions;

  /**
   * Create a new Producer for a queue
   * @param qname name of the queue.
   *
   * @param options.redisClient Optional. redisClient is an instance of `ioredis`
   *    which will be used to duplicate configs to create a new redis connection.
   *
   *    `options.redisClient` is used over `options.redisOptions` if both are present.
   *
   * @param options.redisOptions Optional. Any valid `ioredis` options.
   */
  constructor(qname: string, { redisOptions, redisClient }: ProducerOptions = {}) {
    if (redisClient) {
      this._redis = redisClient.duplicate() as Redis;
    } else {
      this._redisOptions = lodash.merge({}, defaultOptions.redisOptions, redisOptions);
      this._redis = new IORedis(this._redisOptions) as Redis;
    }

    this._QNAME = `${defaultOptions.NAMESPACE}:queue:${qname}`;
    this._DEDUPSET = `${defaultOptions.NAMESPACE}:queue:${qname}:dedupset`;

    this._initialize();
  }

  async _initialize() {
    await initScripts(this._redis);

    this._isInitialized = true;
  }

  async addTask(data = null, dedupKey: string | null = null) {
    await waitUntilInitialized(this, '_isInitialized');

    // enqueue is our custom lua script to handle task de-duplication and adding to streams atomically
    const retval = await this._redis.enqueue(this._QNAME, this._DEDUPSET, JSON.stringify(data), dedupKey, 0);
    return retval;
  }

  async _disconnect() {
    await this._redis.disconnect();
  }
}
