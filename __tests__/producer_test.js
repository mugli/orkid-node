const Producer = require('../src/producer');
const IORedis = require('ioredis');

const { waitOn } = require('promise-callbacks');
const { delay } = require('../src/common');

// TODO: Since we are calling flushall,
// ensure redis in test env can be used with a separate config
describe('Producer', () => {
  let redis;
  let producer;

  beforeAll(async () => {
    redis = new IORedis();
  });

  afterAll(() => {
    redis.disconnect();
  });

  beforeEach(async () => {
    await redis.flushall();
    producer = new Producer('test-queue', { redisClient: redis });
  });

  test('should create task', async () => {
    const id = await producer.addTask('test');
    expect(id).toBeDefined();
  });

  test('should discard task if dedupKey is present and duplicate', async () => {
    const id1 = await producer.addTask('test', 'test');
    expect(id1).toBeDefined();

    const id2 = await producer.addTask('test', 'test');
    expect(id2).toBe(null);
  });
});
