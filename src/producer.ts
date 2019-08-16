import IORedis from 'ioredis';
import * as lodash from 'lodash';

import { initScripts } from './commands';
import { waitUntilInitialized } from './common';

import { defaultOptions } from './defaults';

export interface ProducerOptions {
  redisOptions?: IORedis.RedisOptions;
  redisClient?: IORedis.Redis;
}

interface Redis extends IORedis.Redis {
  enqueue(
    qname: string,
    dedupSet: string,
    data: string,
    dedupKey: string | null,
    retryCount: number
  ): Promise<string | null>;
}

export class Producer {
  _redis: Redis;
  _QNAME: string;
  _DEDUPSET: string;
  _isInitialized: boolean = false;
  _redisOptions: IORedis.RedisOptions = defaults.redisOptions;

  constructor(qname: string, { redisOptions, redisClient }: ProducerOptions = {}) {
    if (redisClient) {
      this._redis = redisClient.duplicate() as Redis;
    } else {
      this._redisOptions = lodash.merge({}, defaults.redisOptions, redisOptions);
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
