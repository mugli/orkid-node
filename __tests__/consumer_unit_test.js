const Producer = require('../src/producer');
const ConsumerUnit = require('../src/consumer-unit');
const IORedis = require('ioredis');

describe('Consumer Unit', () => {
  let redis;
  let producer, consumer;

  beforeAll(async () => {
    // TODO: Since we are calling flushall,
    // ensure redis in test env can be used with a separate config
    redis = new IORedis();
    producer = new Producer('test-queue', { redisClient: redis });
  });

  afterAll(async () => {
    redis.disconnect();
    await producer._disconnect();
  });

  beforeEach(async () => {
    await redis.flushall();
  });

  afterEach(async () => {
    await consumer._disconnect();
  });

  test('should process task', async done => {
    const id = await producer.addTask('test');

    function workerFn(data, metadata) {
      expect(data).toBe('test');
      expect(metadata).toEqual({ id, qname: 'test-queue', retryCount: 0 });

      done();
    }

    consumer = new ConsumerUnit('test-queue', workerFn, { redisClient: redis });
    consumer.start();
  });

  test('should retry task on error', async () => {
    // TODO: Implement
  });

  test('should retry task on timeout', async () => {
    // TODO: Implement
  });

  test('should add to result list on success', async () => {
    // TODO: Implement
  });

  test('should add to failed list on failure', async () => {
    // TODO: Implement
  });

  test('should add to dead list after failure on all retries', async () => {
    // TODO: Implement
  });
});
