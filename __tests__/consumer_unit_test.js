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
  });

  afterAll(() => {
    redis.disconnect();
  });

  beforeEach(async () => {
    await redis.flushall();
    producer = new Producer('test-queue', { redisClient: redis });
    consumer = new ConsumerUnit('test-queue', { redisClient: redis });
  });

  afterEach(async () => {
    await producer._disconnect();
    await consumer._disconnect();
  });

  test('should process task', async () => {
    // TODO: Implement
  });
});
