import IORedis from 'ioredis';
import * as lodash from 'lodash';

import { initScripts, Redis } from './commands';
import { waitUntilInitialized } from './common';

import { defaultOptions, RedisOptions } from './defaults';

export interface ProducerOptions {
  redisOptions?: RedisOptions;
}

export interface Task {
  data: any;
  dedupKey?: string | null;
}

export class Producer {
  _redis: Redis | null = null;
  _QNAME: string;
  qname: string;
  _DEDUPSET: string;
  _isInitialized: boolean = false;
  _redisOptions: RedisOptions = defaultOptions.redisOptions;

  /**
   * Create a new Producer for a queue
   * @param qname name of the queue.
   *
   *
   * @param options.redisOptions Optional. Any valid `ioredis` options.
   */
  constructor(qname: string, { redisOptions }: ProducerOptions = {}) {
    this._redisOptions = lodash.merge({}, defaultOptions.redisOptions, redisOptions);
    this._connect();

    if (!qname || qname === defaultOptions.INTERNALS) {
      throw new Error(`qname cannot be empty or set as "${defaultOptions.INTERNALS}"`);
    }

    this._QNAME = `${defaultOptions.NAMESPACE}:queue:${qname}`;
    this.qname = qname;
    this._DEDUPSET = `${defaultOptions.NAMESPACE}:queue:${qname}:dedupset`;

    this._initialize();
  }

  async _initialize() {
    await initScripts(this._redis!);

    this._isInitialized = true;
  }

  async addTask(data = null, dedupKey: string | null = null): Promise<string | null> {
    if (!this._redis) {
      this._connect();
    }

    await waitUntilInitialized(this, '_isInitialized');

    // enqueue is our custom lua script to handle task de-duplication and adding to streams atomically
    const retval = await this._redis!.enqueue(this.qname, this._DEDUPSET, JSON.stringify(data), dedupKey, 0);
    return retval;
  }

  _flatDeep(arr: any[]): any[] {
    return arr.reduce((acc, val) => acc.concat(Array.isArray(val) ? this._flatDeep(val) : val), []);
  }

  async bulkAddTasks(tasks: Task[], chunkSize: number = 100): Promise<string[]> {
    if (!this._redis) {
      this._connect();
    }

    const chunks = lodash.chunk(tasks, chunkSize);
    let result = [];
    for (const c of chunks) {
      const pipeline = this._redis!.pipeline();

      for (const t of c) {
        pipeline.enqueue(this.qname, this._DEDUPSET, JSON.stringify(t.data || null), t.dedupKey || null, 0);
      }

      const retval = await pipeline.exec();
      result.push(retval);
    }

    result = this._flatDeep(result).filter(i => !!i);

    return result;
  }

  _connect() {
    this._redis = new IORedis(this._redisOptions) as Redis;
  }

  async disconnect() {
    if (this._redis) {
      await this._redis.disconnect();
      this._redis = null;
    }
  }
}
