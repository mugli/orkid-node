const IORedis = require('ioredis');

// const { defaultOptions: defaults } = require('../lib/defaults');
const { delay } = require('../lib/common');

describe('Result/Failed/Dead lists', () => {
  let redis;
  let maxIndividualQueueResultSize;
  let maxGlobalListSize;
  let defaults;
  let Producer;
  let Consumer;

  beforeEach(async () => {
    // TODO: Since we are calling flushall,
    // ensure redis in test env can be used with a separate config
    await redis.flushall();
  });

  beforeAll(async () => {
    redis = new IORedis();

    jest.mock('../lib/defaults', () => {
      const original = jest.requireActual('../lib/defaults');
      original.defaultOptions.queueOptions.maxIndividualQueueResultSize = 20;
      original.defaultOptions.queueOptions.maxGlobalListSize = 30;

      return original;
    });

    /* eslint-disable */
    defaults = require('../lib/defaults').defaultOptions;
    Producer = require('../lib/index').Producer;
    Consumer = require('../lib/index').Consumer;

    maxIndividualQueueResultSize = defaults.queueOptions.maxIndividualQueueResultSize;
    maxGlobalListSize = defaults.queueOptions.maxGlobalListSize;
    /* eslint-enable */
  });

  afterAll(async () => {
    jest.resetModules();
  });

  test('should insert to result list in order', async () => {
    const tasks = Array.from({ length: 10 }).map((_, i) => ({ data: i }));
    const qname = 'result-order-test';

    const producer = new Producer(qname);
    await producer.bulkAddTasks(tasks);
    const consumer = new Consumer(qname, data => data);
    consumer.start();
    await delay(300); // TODO: Hack Remove this delay once queue supports events

    const globalResult = await redis.zrange(defaults.RESULTLIST, 0, -1);
    const queueResult = await redis.zrange(`${defaults.RESULTLIST}:${qname}`, 0, -1);

    expect(globalResult.length).toBe(queueResult.length);
    expect(globalResult.length).toBe(tasks.length);

    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      const g = JSON.parse(globalResult[i]);
      const q = JSON.parse(queueResult[i]);

      expect(t.data).toBe(g.data);
      expect(t.data).toBe(g.result);

      expect(t.data).toBe(q.data);
      expect(t.data).toBe(q.result);
    }
    await producer.disconnect();
  });

  test('should insert to failed list in order', async () => {
    const tasks = Array.from({ length: 10 }).map((_, i) => ({ data: i }));
    const qname = 'failed-order-test';

    const producer = new Producer(qname);
    await producer.bulkAddTasks(tasks);
    const consumer = new Consumer(qname, () => {
      throw new Error();
    });
    consumer.start();
    await delay(300); // TODO: Hack Remove this delay once queue supports events

    const globalFailed = await redis.zrange(defaults.FAILEDLIST, 0, -1);
    const queueFailed = await redis.zrange(`${defaults.FAILEDLIST}:${qname}`, 0, -1);

    expect(globalFailed.length).toBe(queueFailed.length);
    expect(globalFailed.length).toBe(tasks.length);

    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      const g = JSON.parse(globalFailed[i]);
      const q = JSON.parse(queueFailed[i]);

      expect(t.data).toBe(g.data);
      expect(t.data).toBe(q.data);
    }
    await producer.disconnect();
  });

  test('should insert to dead list in order', async () => {
    const tasks = Array.from({ length: 10 }).map((_, i) => ({ data: i }));
    const qname = 'dead-order-test';

    const producer = new Producer(qname);
    await producer.bulkAddTasks(tasks);
    const consumer = new Consumer(qname, () => {
      throw new Error();
    });
    consumer.start();
    await delay(300); // TODO: Hack Remove this delay once queue supports events

    const globalDead = await redis.zrange(defaults.DEADLIST, 0, -1);
    const queueDead = await redis.zrange(`${defaults.DEADLIST}:${qname}`, 0, -1);

    expect(globalDead.length).toBe(queueDead.length);
    expect(globalDead.length).toBe(tasks.length);

    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      const g = JSON.parse(globalDead[i]);
      const q = JSON.parse(queueDead[i]);

      expect(t.data).toBe(g.data);
      expect(t.data).toBe(q.data);
    }
    await producer.disconnect();
  });

  test('should trim from the beginning of the result list when limit exceeds', async () => {
    const overflow = 10;
    const tasks = Array.from({ length: maxGlobalListSize + overflow }).map((_, i) => ({ data: i }));
    const qname = 'result-trim-test';

    const producer = new Producer(qname);
    await producer.bulkAddTasks(tasks.slice(0, maxIndividualQueueResultSize));
    const consumer = new Consumer(qname, data => data);
    consumer.start();
    await delay(200); // TODO: Hack Remove this delay once queue supports events

    let glen = await redis.zcard(defaults.RESULTLIST);
    let qlen = await redis.zcard(`${defaults.RESULTLIST}:${qname}`);

    expect(qlen).toBe(maxIndividualQueueResultSize);
    expect(glen).toBe(maxIndividualQueueResultSize);

    const gfirst = JSON.parse(await redis.zrange(defaults.RESULTLIST, 0, 0));
    const qfirst = JSON.parse(await redis.zrange(`${defaults.RESULTLIST}:${qname}`, 0, 0));

    expect(gfirst.data).toBe(qfirst.data);

    let glast = JSON.parse(await redis.zrange(defaults.RESULTLIST, -1, -1));
    let qlast = JSON.parse(await redis.zrange(`${defaults.RESULTLIST}:${qname}`, -1, -1));

    expect(glast.data).toBe(qlast.data);

    // Add more of the tasks
    await producer.bulkAddTasks(tasks.slice(maxIndividualQueueResultSize - 1, maxGlobalListSize));
    await delay(200); // TODO: Hack Remove this delay once queue supports events

    glen = await redis.zcard(defaults.RESULTLIST);
    qlen = await redis.zcard(`${defaults.RESULTLIST}:${qname}`);

    expect(glen).toBe(maxGlobalListSize);
    expect(qlen).toBe(maxIndividualQueueResultSize);

    glast = JSON.parse(await redis.zrange(defaults.RESULTLIST, -1, -1));
    qlast = JSON.parse(await redis.zrange(`${defaults.RESULTLIST}:${qname}`, -1, -1));

    expect(glast.data).toBe(qlast.data);

    // Add rest of the tasks
    await producer.bulkAddTasks(tasks.slice(maxGlobalListSize - 1));
    await delay(200); // TODO: Hack Remove this delay once queue supports events

    glen = await redis.zcard(defaults.RESULTLIST);
    qlen = await redis.zcard(`${defaults.RESULTLIST}:${qname}`);

    expect(glen).toBe(maxGlobalListSize);
    expect(qlen).toBe(maxIndividualQueueResultSize);

    glast = JSON.parse(await redis.zrange(defaults.RESULTLIST, -1, -1));
    qlast = JSON.parse(await redis.zrange(`${defaults.RESULTLIST}:${qname}`, -1, -1));

    expect(glast.data).toBe(qlast.data);

    await producer.disconnect();
  });

  test('should trim from the beginning of the failed list when limit exceeds', async () => {
    const overflow = 10;
    const tasks = Array.from({ length: maxGlobalListSize + overflow }).map((_, i) => ({ data: i }));
    const qname = 'failed-trim-test';

    const producer = new Producer(qname);
    await producer.bulkAddTasks(tasks.slice(0, maxIndividualQueueResultSize));
    const consumer = new Consumer(qname, () => {
      throw new Error();
    });
    consumer.start();
    await delay(200); // TODO: Hack Remove this delay once queue supports events

    let glen = await redis.zcard(defaults.FAILEDLIST);
    let qlen = await redis.zcard(`${defaults.FAILEDLIST}:${qname}`);

    expect(qlen).toBe(maxIndividualQueueResultSize);
    expect(glen).toBe(maxIndividualQueueResultSize);

    const gfirst = JSON.parse(await redis.zrange(defaults.FAILEDLIST, 0, 0));
    const qfirst = JSON.parse(await redis.zrange(`${defaults.FAILEDLIST}:${qname}`, 0, 0));

    expect(gfirst.data).toBe(qfirst.data);

    let glast = JSON.parse(await redis.zrange(defaults.FAILEDLIST, -1, -1));
    let qlast = JSON.parse(await redis.zrange(`${defaults.FAILEDLIST}:${qname}`, -1, -1));

    expect(glast.data).toBe(qlast.data);

    // Add more of the tasks
    await producer.bulkAddTasks(tasks.slice(maxIndividualQueueResultSize - 1, maxGlobalListSize));
    await delay(200); // TODO: Hack Remove this delay once queue supports events

    glen = await redis.zcard(defaults.FAILEDLIST);
    qlen = await redis.zcard(`${defaults.FAILEDLIST}:${qname}`);

    expect(glen).toBe(maxGlobalListSize);
    expect(qlen).toBe(maxIndividualQueueResultSize);

    glast = JSON.parse(await redis.zrange(defaults.FAILEDLIST, -1, -1));
    qlast = JSON.parse(await redis.zrange(`${defaults.FAILEDLIST}:${qname}`, -1, -1));

    expect(glast.data).toBe(qlast.data);

    // Add rest of the tasks
    await producer.bulkAddTasks(tasks.slice(maxGlobalListSize - 1));
    await delay(200); // TODO: Hack Remove this delay once queue supports events

    glen = await redis.zcard(defaults.FAILEDLIST);
    qlen = await redis.zcard(`${defaults.FAILEDLIST}:${qname}`);

    expect(glen).toBe(maxGlobalListSize);
    expect(qlen).toBe(maxIndividualQueueResultSize);

    glast = JSON.parse(await redis.zrange(defaults.FAILEDLIST, -1, -1));
    qlast = JSON.parse(await redis.zrange(`${defaults.FAILEDLIST}:${qname}`, -1, -1));

    expect(glast.data).toBe(qlast.data);

    await producer.disconnect();
  });

  test('should trim from the beginning of the dead list when limit exceeds', async () => {
    const overflow = 10;
    const tasks = Array.from({ length: maxGlobalListSize + overflow }).map((_, i) => ({ data: i }));
    const qname = 'dead-trim-test';

    const producer = new Producer(qname);
    await producer.bulkAddTasks(tasks.slice(0, maxIndividualQueueResultSize));
    const consumer = new Consumer(qname, () => {
      throw new Error();
    });
    consumer.start();
    await delay(200); // TODO: Hack Remove this delay once queue supports events

    let glen = await redis.zcard(defaults.DEADLIST);
    let qlen = await redis.zcard(`${defaults.DEADLIST}:${qname}`);

    expect(qlen).toBe(maxIndividualQueueResultSize);
    expect(glen).toBe(maxIndividualQueueResultSize);

    const gfirst = JSON.parse(await redis.zrange(defaults.DEADLIST, 0, 0));
    const qfirst = JSON.parse(await redis.zrange(`${defaults.DEADLIST}:${qname}`, 0, 0));

    expect(gfirst.data).toBe(qfirst.data);

    let glast = JSON.parse(await redis.zrange(defaults.DEADLIST, -1, -1));
    let qlast = JSON.parse(await redis.zrange(`${defaults.DEADLIST}:${qname}`, -1, -1));

    expect(glast.data).toBe(qlast.data);

    // Add more of the tasks
    await producer.bulkAddTasks(tasks.slice(maxIndividualQueueResultSize - 1, maxGlobalListSize));
    await delay(200); // TODO: Hack Remove this delay once queue supports events

    glen = await redis.zcard(defaults.DEADLIST);
    qlen = await redis.zcard(`${defaults.DEADLIST}:${qname}`);

    expect(glen).toBe(maxGlobalListSize);
    expect(qlen).toBe(maxIndividualQueueResultSize);

    glast = JSON.parse(await redis.zrange(defaults.DEADLIST, -1, -1));
    qlast = JSON.parse(await redis.zrange(`${defaults.DEADLIST}:${qname}`, -1, -1));

    expect(glast.data).toBe(qlast.data);

    // Add rest of the tasks
    await producer.bulkAddTasks(tasks.slice(maxGlobalListSize - 1));
    await delay(200); // TODO: Hack Remove this delay once queue supports events

    glen = await redis.zcard(defaults.DEADLIST);
    qlen = await redis.zcard(`${defaults.DEADLIST}:${qname}`);

    expect(glen).toBe(maxGlobalListSize);
    expect(qlen).toBe(maxIndividualQueueResultSize);

    glast = JSON.parse(await redis.zrange(defaults.DEADLIST, -1, -1));
    qlast = JSON.parse(await redis.zrange(`${defaults.DEADLIST}:${qname}`, -1, -1));

    expect(glast.data).toBe(qlast.data);

    await producer.disconnect();
  });
});
