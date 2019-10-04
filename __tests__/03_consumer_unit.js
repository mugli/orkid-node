const IORedis = require('ioredis');
const shortid = require('shortid');

const { Producer } = require('../lib/producer');
const { ConsumerUnit } = require('../lib/consumer-unit');
const { defaultOptions: defaults } = require('../lib/defaults');
const { delay } = require('../lib/common');

describe('Consumer Unit', () => {
  let redis;
  const producers = [];
  const consumers = [];

  beforeAll(async () => {
    // TODO: Since we are calling flushall,
    // ensure redis in test env can be used with a separate config
    redis = new IORedis();
    await redis.flushall();
  });

  afterAll(async () => {
    for (const producer of producers) {
      await producer._disconnect();
    }
    for (const consumer of consumers) {
      await consumer._disconnect();
    }
    await redis.flushall();
    await redis.disconnect();
  });

  test('should process task', async done => {
    const taskData = `test-${shortid.generate()}`;

    const qname = `queue-${shortid.generate()}`;
    const producer = new Producer(qname, { redisClient: redis });
    producers.push(producer);

    const id = await producer.addTask(taskData);

    async function workerFn(data, metadata) {
      expect(data).toBe(taskData);
      expect(metadata).toMatchObject({ id, qname, retryCount: 0 });

      done();
    }

    const consumer = new ConsumerUnit(qname, workerFn, { redisClient: redis });
    consumers.push(consumer);
    consumer.start();
  });

  test('should process task with complex data/arg', async done => {
    const taskData = { name: `test-${shortid.generate()}`, nested: { arr: [1, 2, 3], nested: { arr: [1, 2, 3] } } };

    const qname = `queue-${shortid.generate()}`;
    const producer = new Producer(qname, { redisClient: redis });
    producers.push(producer);

    const id = await producer.addTask(taskData);

    async function workerFn(data, metadata) {
      expect(data).toEqual(taskData);
      expect(metadata).toMatchObject({ id, qname, retryCount: 0 });

      done();
    }

    const consumer = new ConsumerUnit(qname, workerFn, { redisClient: redis });
    consumers.push(consumer);
    consumer.start();
  });

  test('should retry task on error', async done => {
    const taskData = `test-${shortid.generate()}`;

    const qname = `queue-${shortid.generate()}`;
    const producer = new Producer(qname, { redisClient: redis });
    producers.push(producer);

    const id = await producer.addTask(taskData);
    const maxRetry = 2;

    async function workerFn(data, metadata) {
      expect(data).toBe(taskData);

      if (metadata.retryCount !== maxRetry) {
        expect(metadata).toMatchObject({ id, qname });
        throw new Error();
      } else {
        // This task should have a new ID when retrying since it has been re-entered in the queue
        expect(metadata.id).not.toBe(id);
        expect(metadata.retryCount).toBe(maxRetry);

        done();
      }
    }

    const consumer = new ConsumerUnit(qname, workerFn, {
      redisClient: redis,
      consumerOptions: { maxRetry }
    });
    consumers.push(consumer);
    consumer.start();
  });

  test('should retry task on timeout', async done => {
    const taskData = `test-${shortid.generate()}`;

    const qname = `queue-${shortid.generate()}`;
    const producer = new Producer(qname, { redisClient: redis });
    producers.push(producer);

    const id = await producer.addTask(taskData);
    const maxRetry = 2;

    async function workerFn(data, metadata) {
      expect(data).toBe(taskData);

      if (metadata.retryCount !== maxRetry) {
        expect(metadata).toMatchObject({ id, qname });
        await delay(15);
      } else {
        // This task should have a new ID when retrying since it has been re-entered in the queue
        expect(metadata.id).not.toBe(id);
        expect(metadata.retryCount).toBe(maxRetry);

        done();
      }
    }

    const consumer = new ConsumerUnit(qname, workerFn, {
      redisClient: redis,
      consumerOptions: { maxRetry, workerFnTimeoutMs: 10 }
    });
    consumers.push(consumer);
    consumer.start();
  });

  test('should add to result list on success', async () => {
    const taskData = `test-${shortid.generate()}`;

    const qname = `queue-${shortid.generate()}`;
    const producer = new Producer(qname, { redisClient: redis });
    producers.push(producer);

    const id = await producer.addTask(taskData);
    const startTime = new Date();
    const result = { mykey: 'passed with flying colors!' };

    function workerFn(data, metadata) {
      expect(data).toBe(taskData);

      expect(metadata).toMatchObject({ id, qname });
      return result;
    }

    // Clear the result list first
    await redis.del(defaults.RESULTLIST);

    const consumer = new ConsumerUnit(qname, workerFn, { redisClient: redis });
    consumers.push(consumer);
    consumer.start();

    await delay(100); // TODO: Replace flaky time based awaits using event-emitter in future
    const passed = JSON.parse(await redis.lpop(defaults.RESULTLIST));

    expect(passed).toMatchObject({
      id,
      qname,
      data: taskData,
      dedupKey: '',
      retryCount: 0,
      result
    });
    expect(new Date(passed.at).getTime()).toBeGreaterThan(startTime.getTime());
  });

  test('should add to failed list on failure', async () => {
    const taskData = `test-${shortid.generate()}`;

    const qname = `queue-${shortid.generate()}`;
    const producer = new Producer(qname, { redisClient: redis });
    producers.push(producer);

    const id = await producer.addTask(taskData);
    const startTime = new Date();

    function workerFn(data, metadata) {
      expect(data).toBe(taskData);

      expect(metadata).toMatchObject({ id, qname });
      throw new Error('Failed here!');
    }

    // Clear the failed list first
    await redis.del(defaults.FAILEDLIST);

    const consumer = new ConsumerUnit(qname, workerFn, { redisClient: redis });
    consumers.push(consumer);
    consumer.start();

    await delay(100); // TODO: Replace flaky time based awaits using event-emitter in future
    const failed = JSON.parse(await redis.lpop(defaults.FAILEDLIST));
    const { error } = failed;
    expect(failed).toMatchObject({ id, qname, data: taskData, dedupKey: '', retryCount: 0 });
    expect(new Date(failed.at).getTime()).toBeGreaterThan(startTime.getTime());
    expect(error).toMatchObject({ name: 'Error', message: 'Failed here!' });
    expect(error.stack).not.toBeFalsy();
  });

  test('should add to failed list for all failures and retries', async () => {
    const taskData = `test-${shortid.generate()}`;

    const qname = `queue-${shortid.generate()}`;
    const producer = new Producer(qname, { redisClient: redis });
    producers.push(producer);

    await producer.addTask(taskData);
    const startTime = new Date();
    const maxRetry = 2;

    async function workerFn(data, metadata) {
      expect(data).toBe(taskData);

      const failListCount = await redis.llen(defaults.FAILEDLIST);
      expect(failListCount).toBe(metadata.retryCount);

      if (metadata.retryCount <= maxRetry) {
        expect(metadata).toMatchObject({ qname });

        // Dead list should be empty until we reach maxRetry
        const dead = await redis.lpop(defaults.DEADLIST);
        expect(dead).toBe(null);

        throw new Error('Task failed');
      }
    }

    // Clear the lists first
    await redis.del(defaults.DEADLIST);
    await redis.del(defaults.FAILEDLIST);

    const consumer = new ConsumerUnit(qname, workerFn, {
      redisClient: redis,
      consumerOptions: { maxRetry }
    });
    consumers.push(consumer);
    consumer.start();

    await delay(300); // TODO: Replace flaky time based awaits using event-emitter in future

    // Check failed list
    const failedList = (await redis.lrange(defaults.FAILEDLIST, 0, -1)).map(item => JSON.parse(item));
    expect(failedList.length).toBe(maxRetry + 1);
    for (const [i, failed] of failedList.entries()) {
      const { error } = failed;
      expect(failed).toMatchObject({ qname, data: taskData, dedupKey: '', retryCount: maxRetry - i });
      expect(new Date(failed.at).getTime()).toBeGreaterThan(startTime.getTime());
      expect(error).toMatchObject({ name: 'Error', message: 'Task failed' });
      expect(error.stack).not.toBeFalsy();
    }
  });

  test('should add to dead list after failure only after all retries', async () => {
    const taskData = `test-${shortid.generate()}`;

    const qname = `queue-${shortid.generate()}`;
    const producer = new Producer(qname, { redisClient: redis });
    producers.push(producer);

    await producer.addTask(taskData);
    const startTime = new Date();
    const maxRetry = 2;

    async function workerFn(data, metadata) {
      expect(data).toBe(taskData);

      const failListCount = await redis.llen(defaults.FAILEDLIST);
      expect(failListCount).toBe(metadata.retryCount);

      if (metadata.retryCount <= maxRetry) {
        expect(metadata).toMatchObject({ qname });

        // Dead list should be empty until we reach maxRetry
        const dead = await redis.lpop(defaults.DEADLIST);
        expect(dead).toBe(null);

        throw new Error('Threw this!');
      }
    }

    // Clear the lists first
    await redis.del(defaults.DEADLIST);
    await redis.del(defaults.FAILEDLIST);

    const consumer = new ConsumerUnit(qname, workerFn, {
      redisClient: redis,
      consumerOptions: { maxRetry }
    });
    consumers.push(consumer);
    consumer.start();

    await delay(300); // TODO: Replace flaky time based awaits using event-emitter in future

    // Check dead list
    const dead = JSON.parse(await redis.lpop(defaults.DEADLIST));
    const { error } = dead;
    expect(dead).toMatchObject({ qname, data: taskData, dedupKey: '', retryCount: maxRetry });
    expect(new Date(dead.at).getTime()).toBeGreaterThan(startTime.getTime());
    expect(error).toMatchObject({ name: 'Error', message: 'Threw this!' });
    expect(error.stack).not.toBeFalsy();
  });
});
