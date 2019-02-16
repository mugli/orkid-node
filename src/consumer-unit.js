const prepareIoredis = require('./prepare-ioredis.js');
prepareIoredis();

const IORedis = require('ioredis');
const lodash = require('lodash');
const shortid = require('shortid');

const initScripts = require('./commands');
const { waitUntilInitialized } = require('./common');
const Task = require('./task');
const { ReplyError } = require('redis-errors');
const { TimeoutError } = require('./errors');

const defaults = require('./defaults');

class ConsumerUnit {
  constructor(qname, workerFn, { consumerOptions, redisOptions, redisClient, loggingOptions } = {}) {
    this._paused = true;

    this._QNAME = `${defaults.NAMESPACE}:queue:${qname}`;
    this._DEDUPSET = `${defaults.NAMESPACE}:queue:${qname}:dedupset`;
    this.qname = qname;
    this._GRPNAME = `${defaults.NAMESPACE}:queue:${qname}:cg`;

    this.workerFn = workerFn;
    this._pendingTasks = [];
    this._totalTasks = 0;

    this.consumerOptions = lodash.merge({}, defaults.consumerOptions, consumerOptions);
    this.loggingOptions = lodash.merge({}, defaults.loggingOptions, loggingOptions);

    if (redisClient) {
      this._redis = redisClient.duplicate();
    } else {
      this.redisOptions = lodash.merge({}, defaults.redisOptions, redisOptions);
      this._redis = new IORedis(this.redisOptions);
    }

    this._initialize();
  }

  start() {
    waitUntilInitialized(this, '_isInitialized').then(() => {
      this._paused = false;
      this._processLoop();
    });
  }

  pause() {
    this._paused = true;
  }

  resume() {
    this.start();
  }

  async _ensureConsumerGroupExists() {
    try {
      // XGROUP CREATE mystream mygroup 0 MKSTREAM
      console.log('Ensuring consumer group exists', { QNAME: this._QNAME, GRPNAME: this._GRPNAME });
      await this._redis.xgroup('CREATE', this._QNAME, this._GRPNAME, 0, 'MKSTREAM');
    } catch (e) {
      // BUSYGROUP -> the consumer group is already present, ignore
      if (!(e instanceof ReplyError && e.message.includes('BUSYGROUP'))) {
        throw e;
      }
    }
  }

  async _initialize() {
    if (this._name) {
      // We already have a name? Reconnecting in this case
      await this._redis.client('SETNAME', this._name);
      return;
    }

    await initScripts(this._redis);

    const id = await this._redis.client('id');
    this._name = `${this._GRPNAME}:c:${id}-${shortid.generate()}`;
    await this._redis.client('SETNAME', this._name);

    await this._ensureConsumerGroupExists();

    this._isInitialized = true;
  }

  async _getPendingTasks() {
    console.log('🔍', this._name, ' :: Checking pending tasks');

    const taskObj = await this._redis.xreadgroup(
      'GROUP',
      this._GRPNAME,
      this._name,
      'COUNT',
      this.consumerOptions.taskBufferSize,
      'STREAMS',
      this._QNAME,
      '0'
    );
    const tasks = [].concat(...Object.values(taskObj));

    console.dir({ taskObj, tasks, pendingTasks: this._pendingTasks }, { depth: null });

    for (const t of tasks) {
      const task = new Task(t.id, t.data);
      this._pendingTasks.push(task);
    }
  }

  async _waitForTask() {
    console.log('📭 ', this._name, ` :: Waiting for tasks. Processed so far: ${this._totalTasks}`);

    await this._redis.xreadgroup(
      'GROUP',
      this._GRPNAME,
      this._name,
      'BLOCK',
      0,
      'COUNT',
      1,
      'STREAMS',
      this._QNAME,
      '>'
    );

    console.log('🔔 ', this._name, ' :: Got new task!');
  }

  async _cleanUp() {
    function difference(setA, setB) {
      var _difference = new Set(setA);
      for (var elem of setB) {
        _difference.delete(elem);
      }
      return _difference;
    }

    const info = await this._redis.xinfo('CONSUMERS', this._QNAME, this._GRPNAME);
    const consumerInfo = {};
    for (const inf of info) {
      const data = {};
      for (let i = 0; i < inf.length; i += 2) {
        data[inf[i]] = inf[i + 1];
      }
      consumerInfo[inf[1]] = data;
    }
    console.dir({ consumerInfo }, { depth: null });
    const consumerNames = Object.keys(consumerInfo);
    const pendingConsumerNames = new Set();
    const emptyConsumerNames = new Set();
    for (const con of consumerNames) {
      if (consumerInfo[con].pending) {
        pendingConsumerNames.add(con);
      } else {
        if (consumerInfo[con].idle > this.consumerOptions.workerFnTimeoutMs * 5) {
          // Just to be safe, only delete really world consumers
          emptyConsumerNames.add(con);
        }
      }
    }
    console.log({ pendingConsumerNames });

    const clients = (await this._redis.client('LIST')).split('\n');
    const activeWorkers = new Set();
    for (const cli of clients) {
      cli.split(' ').map(v => {
        if (v.startsWith('name=')) {
          const namePair = v.split('=');
          if (namePair.length > 1 && namePair[1].length) {
            activeWorkers.add(namePair[1]);
          }
        }
      });
    }

    console.log({ clients, activeWorkers });

    const orphanWorkers = difference(pendingConsumerNames, activeWorkers);
    const orphanEmptyWorkers = difference(emptyConsumerNames, activeWorkers);

    for (const w of orphanWorkers) {
      const pendingTasks = await this._redis.xpending(this._QNAME, this._GRPNAME, '-', '+', 1000, w);
      console.log({ pendingTasks });
      const ids = pendingTasks.map(t => t.id);
      const claim = await this._redis.xclaim(
        this._QNAME,
        this._GRPNAME,
        this._name,
        this.consumerOptions.workerFnTimeoutMs * 2,
        ...ids,
        'JUSTID'
      );
      console.log(`🤝 ${this._name} :: Claimed ${claim.length} pending tasks from worker ${w}`);
    }

    for (const w of orphanEmptyWorkers) {
      await this._redis.delconsumer(this._QNAME, this._GRPNAME, w);
      console.log(`🧹 ${this._name} :: Deleted old consumer ${w}`);
    }
  }

  async _processLoop() {
    if (this._loopStarted) {
      return;
    }

    this._loopStarted = true;

    while (!this._paused) {
      await this._cleanUp();
      await this._getPendingTasks();

      if (!this._pendingTasks.length) {
        await this._waitForTask();
      }

      while (this._pendingTasks.length && !this._paused) {
        await this.processTask();
      }
    }

    this._loopStarted = false;
  }

  async processTask() {
    if (!this._pendingTasks.length) {
      return;
    }

    const task = this._pendingTasks.shift();
    console.log(this._name, ' :: Staring to process task', task);
    this._totalTasks++;

    const metadata = { id: task.id, qname: this.qname, retryCount: task.retryCount };
    try {
      const result = await this._wrapWorkerFn(task.dataObj, metadata);
      await this._processSuccess(task, result);
    } catch (e) {
      if (e instanceof TimeoutError) {
        console.log('⏰ ', this._name, `:: Worker ${task.id} timed out`, e);
      } else {
        console.log('💣 ', this._name, ` :: Worker ${task.id} crashed`, e);
      }

      await this._processFailure(task, e);
    }
  }

  async _processSuccess(task, result) {
    console.log('✅ ', this._name, ` :: DONE!! Worker ${task.id} done working`, result);

    const resultVal = JSON.stringify({
      id: task.id,
      qname: this.qname,
      data: task.dataObj,
      dedupKey: task.dedupKey,
      retryCount: task.retryCount,
      result,
      at: new Date().toISOString()
    });

    // Add to success list
    await this._redis
      .pipeline()
      .dequeue(this._QNAME, this._DEDUPSET, this._GRPNAME, task.id, task.dedupKey) // Remove from queue
      .lpush(defaults.RESULTLIST, resultVal)
      .ltrim(defaults.RESULTLIST, 0, defaults.queueOptions.maxResultListSize - 1)
      .exec();
  }

  async _processFailure(task, error) {
    const info = JSON.stringify({
      id: task.id,
      qname: this.qname,
      data: task.dataObj,
      dedupKey: task.dedupKey,
      retryCount: task.retryCount,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      at: new Date().toISOString()
    });

    if (task.retryCount < this.consumerOptions.maxRetry) {
      task.incrRetry();
      // Send again to the queue
      await this._redis.requeue(
        this._QNAME,
        this._DEDUPSET,
        this._GRPNAME,
        task.id,
        task.dataString,
        task.dedupKey,
        task.retryCount
      );
    } else {
      // Move to deadlist
      await this._redis
        .pipeline()
        .dequeue(this._QNAME, this._DEDUPSET, this._GRPNAME, task.id, task.dedupKey) // Remove from queue
        .lpush(defaults.DEADLIST, info)
        .ltrim(defaults.DEADLIST, 0, defaults.queueOptions.maxDeadListSize - 1)
        .exec();
    }

    // Add to failed list in all cases
    await this._redis
      .pipeline()
      .lpush(defaults.FAILEDLIST, info)
      .ltrim(defaults.FAILEDLIST, 0, defaults.queueOptions.maxFailedListSize - 1)
      .exec();
  }

  _wrapWorkerFn(data, metadata) {
    const timeoutMs = this.consumerOptions.workerFnTimeoutMs;
    const timeoutP = new Promise((resolve, reject) => {
      const to = setTimeout(() => {
        clearTimeout(to);
        reject(new TimeoutError(`Task timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    const workerP = this.workerFn(data, metadata);

    return Promise.race([timeoutP, workerP]);
  }

  async _disconnect() {
    this._paused = true;
    await waitUntilInitialized(this, '_isInitialized');
    await this._redis.disconnect();
  }
}

module.exports = ConsumerUnit;
