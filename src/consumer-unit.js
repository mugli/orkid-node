const prepareIoredis = require('./prepare-ioredis.js');
prepareIoredis();

const IORedis = require('ioredis');
const lodash = require('lodash');
const shortid = require('shortid');

const initScripts = require('./commands');
const { delay } = require('./common');
const Task = require('./task');
const { ReplyError } = require('redis-errors');
const { TimeoutError } = require('./errors');

const defaults = require('./defaults');

class ConsumerUnit {
  constructor(qname, workerFn, { consumerOptions, redisOptions, loggingOptions } = {}) {
    this.paused = true;

    this.QNAME = `${defaults.NAMESPACE}:queue:${qname}`;
    this.RETRYQNAME = `${defaults.NAMESPACE}:queue:${qname}:retry`;
    this.DEDUPSET = `${defaults.NAMESPACE}:queue:${qname}:dedupset`;
    this.qname = qname;
    this.GRPNAME = `${defaults.NAMESPACE}:queue:${qname}:cg`;

    this.workerFn = workerFn;
    this.pendingTasks = [];
    this.totalTasks = 0;

    this.consumerOptions = lodash.merge({}, defaults.consumerOptions, consumerOptions);
    this.redisOptions = lodash.merge({}, defaults.redisOptions, redisOptions);
    this.loggingOptions = lodash.merge({}, defaults.loggingOptions, loggingOptions);

    this.redis = new IORedis(this.redisOptions);
    this.redis.on('connect', this.initialize.bind(this));
  }

  async waitUntilInitialized() {
    while (!this.initialized) {
      await delay(50);
    }
  }

  start() {
    if (!this.paused) {
      return;
    }

    this.waitUntilInitialized().then(() => {
      this.paused = false;
      this.processLoop();
    });
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.start();
  }

  async ensureConsumerGroupExists() {
    try {
      // XGROUP CREATE mystream mygroup 0 MKSTREAM
      console.log('Ensuring consumer group exists', { QNAME: this.QNAME, GRPNAME: this.GRPNAME });
      await this.redis.xgroup('CREATE', this.QNAME, this.GRPNAME, 0, 'MKSTREAM');
    } catch (e) {
      // BUSYGROUP -> the consumer group is already present, ignore
      if (!(e instanceof ReplyError && e.message.includes('BUSYGROUP'))) {
        throw e;
      }
    }
  }

  async initialize() {
    if (this.name) {
      // We already have a name? Reconnecting in this case
      await this.redis.client('SETNAME', this.name);
      return;
    }

    await initScripts(this.redis);
    await delay(100); // Not sure if needed here. Does ioredis.defineCommand return a promise?
    const id = await this.redis.client('id');
    this.name = `${this.GRPNAME}:c:${id}-${shortid.generate()}`;
    await this.redis.client('SETNAME', this.name);

    await this.ensureConsumerGroupExists();

    this.initialized = true;
  }

  async getPendingTasks() {
    console.log('🔍', this.name, ' :: Checking pending tasks');

    const taskObj = await this.redis.xreadgroup(
      'GROUP',
      this.GRPNAME,
      this.name,
      'COUNT',
      this.consumerOptions.taskBufferSize,
      'STREAMS',
      this.QNAME,
      '0'
    );
    const tasks = [].concat(...Object.values(taskObj));

    console.dir({ taskObj, tasks, pendingTasks: this.pendingTasks }, { depth: null });

    for (const t of tasks) {
      const task = new Task(t.id, t.data);
      this.pendingTasks.push(task);
    }
  }

  async waitForTask() {
    console.log('📭 ', this.name, ` :: Waiting for tasks. Processed so far: ${this.totalTasks}`);

    await this.redis.xreadgroup('GROUP', this.GRPNAME, this.name, 'BLOCK', 0, 'COUNT', 1, 'STREAMS', this.QNAME, '>');

    console.log('🔔 ', this.name, ' :: Got new task!');
  }

  async cleanUp() {
    function difference(setA, setB) {
      var _difference = new Set(setA);
      for (var elem of setB) {
        _difference.delete(elem);
      }
      return _difference;
    }

    const info = await this.redis.xinfo('CONSUMERS', this.QNAME, this.GRPNAME);
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

    const clients = (await this.redis.client('LIST')).split('\n');
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
      const pendingTasks = await this.redis.xpending(this.QNAME, this.GRPNAME, '-', '+', 1000, w);
      console.log({ pendingTasks });
      const ids = pendingTasks.map(t => t.id);
      const claim = await this.redis.xclaim(
        this.QNAME,
        this.GRPNAME,
        this.name,
        this.consumerOptions.workerFnTimeoutMs * 2,
        ...ids,
        'JUSTID'
      );
      console.log(`🤝 ${this.name} :: Claimed ${claim.length} pending tasks from worker ${w}`);
    }

    for (const w of orphanEmptyWorkers) {
      await this.redis.delconsumer(this.QNAME, this.GRPNAME, w);
      console.log(`🧹 ${this.name} :: Deleted old consumer ${w}`);
    }
  }

  async processLoop() {
    do {
      await this.cleanUp();
      await this.getPendingTasks();

      if (!this.pendingTasks.length) {
        await this.waitForTask();
      }

      while (this.pendingTasks.length && !this.paused) {
        await this.processTask();
      }
    } while (!this.paused);
  }

  async processTask() {
    if (!this.pendingTasks.length) {
      return;
    }

    const task = this.pendingTasks.shift();
    console.log(this.name, ' :: Staring to process task', task);
    this.totalTasks++;

    const metadata = { id: task.id, qname: this.qname, retryCount: task.retryCount };
    try {
      const result = await this.wrapWorkerFn(task.dataObj, metadata);
      await this.processSuccess(task, result);
    } catch (e) {
      if (e instanceof TimeoutError) {
        console.log('⏰ ', this.name, `:: Worker ${task.id} timed out`, e);
      } else {
        console.log('💣 ', this.name, ` :: Worker ${task.id} crashed`, e);
      }

      await this.processFailure(task, e);
    }
  }

  async processSuccess(task, result) {
    console.log('✅ ', this.name, ` :: DONE!! Worker ${task.id} done working`, result);

    const resultVal = JSON.stringify({
      id: task.id,
      qname: this.qname,
      data: task.dataObj,
      retryCount: task.retryCount,
      result,
      at: new Date().toISOString()
    });

    // Add to success list
    await this.redis
      .pipeline()
      .dequeue(this.QNAME, this.DEDUPSET, this.GRPNAME, task.id, task.dedupKey) // Remove from queue
      .lpush(defaults.RESULTLIST, resultVal)
      .ltrim(defaults.RESULTLIST, 0, defaults.queueOptions.maxResultListSize - 1)
      .exec();
  }

  async processFailure(task, error) {
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
      await this.redis.requeue(
        this.QNAME,
        this.DEDUPSET,
        this.GRPNAME,
        task.id,
        task.dataString,
        task.dedupKey,
        task.retryCount
      );
    } else {
      // Move to deadlist
      await this.redis
        .pipeline()
        .dequeue(this.QNAME, this.DEDUPSET, this.GRPNAME, task.id, task.dedupKey) // Remove from queue
        .lpush(defaults.DEADLIST, info)
        .ltrim(defaults.DEADLIST, 0, defaults.queueOptions.maxDeadListSize - 1)
        .exec();
    }

    // Add to failed list in all cases
    await this.redis
      .pipeline()
      .lpush(defaults.FAILEDLIST, info)
      .ltrim(defaults.FAILEDLIST, 0, defaults.queueOptions.maxFailedListSize - 1)
      .exec();
  }

  wrapWorkerFn(data, metadata) {
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
}

module.exports = ConsumerUnit;
