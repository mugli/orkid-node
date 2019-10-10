const IORedis = require('ioredis');
const { Producer } = require('../lib/producer');
const { defaultOptions: defaults } = require('../lib/defaults');

describe('Producer', () => {
  let redis;
  let producer;

  beforeAll(async () => {
    // TODO: Since we are calling flushall,
    // ensure redis in test env can be used with a separate config
    redis = new IORedis();
    await redis.flushall();
    producer = new Producer('test-queue', {});
  });

  afterAll(async () => {
    // try {
    //   await producer.disconnect();
    //   await redis.flushall();
    //   await redis.disconnect();
    // } catch (e) {
    //   console.error(e);
    // }
  });

  test('should create task', async () => {
    const id = await producer.addTask('test');
    expect(id).toBeDefined();
  });

  test('should bulk create task', async () => {
    const tasks = Array.from({ length: 1000 }).map((_, i) => ({ data: i }));

    const qname = 'test-queue-bulk';
    const bulkProducer = new Producer(qname, {});
    const ids = await bulkProducer.bulkAddTasks(tasks, 200);
    await bulkProducer.disconnect();

    const waitingCount = await redis.xlen(`${defaults.NAMESPACE}:queue:${qname}`);

    expect(waitingCount).toBe(tasks.length);
    expect(ids.length).toBe(tasks.length);
  });

  test('should deduplicate when bulk creating task', async () => {
    const tasks = Array.from({ length: 1000 }).map((_, i) => ({ data: i, dedupKey: '__' }));

    const qname = 'test-queue-bulk-dedup';
    const bulkProducer = new Producer(qname, {});
    const ids = await bulkProducer.bulkAddTasks(tasks, 200);
    await bulkProducer.disconnect();

    const waitingCount = await redis.xlen(`${defaults.NAMESPACE}:queue:${qname}`);

    expect(waitingCount).toBe(1);
    expect(ids.length).toBe(1);
  });

  test('should discard task if dedupKey is present and duplicate', async () => {
    const id1 = await producer.addTask('test', 'test');
    expect(id1).toBeDefined();

    const id2 = await producer.addTask('test', 'test');
    expect(id2).toBe(null);
  });
});
