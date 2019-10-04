const IORedis = require('ioredis');
const shortid = require('shortid');

const { Producer } = require('../lib/producer');
const { ConsumerUnit } = require('../lib/consumer-unit');
const { delay, waitUntilInitialized } = require('../lib/common');

describe('Consumer Unit - Cleanup', () => {
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

  test('claim ownership of unfinished tasks from inactive consumers', async () => {
    const qname = `queue-test-${shortid.generate()}`;

    const producer = new Producer(qname, { redisClient: redis });
    producers.push(producer);

    for (let i = 0; i < 2; i++) {
      const taskData = `test-data-${shortid.generate()}`;
      await producer.addTask(taskData);
    }

    const consumerOptions = {
      taskBufferSize: 1,
      workerFnTimeoutMs: 10
    };

    const loggingOptions = {
      enabled: false
    };

    const faultyConsumer = new ConsumerUnit(qname, () => {}, { redisClient: redis, consumerOptions, loggingOptions });
    const activeConsumer = new ConsumerUnit(qname, () => {}, { redisClient: redis, consumerOptions, loggingOptions });
    consumers.push(activeConsumer);

    await waitUntilInitialized(faultyConsumer, '_isInitialized');
    await waitUntilInitialized(activeConsumer, '_isInitialized');

    const faultyConsumerName = faultyConsumer._name;
    const activeConsumerName = activeConsumer._name;

    await faultyConsumer._waitForTask();
    await activeConsumer._waitForTask();
    const taskCount1 = await faultyConsumer._getPendingTasks();
    expect(taskCount1).toBe(1);
    const taskCount2 = await activeConsumer._getPendingTasks();
    expect(taskCount2).toBe(1);

    await faultyConsumer._disconnect();
    await activeConsumer._processTask();

    // Wait for redis client to disconnect
    await delay(100);

    const cleanupInfo = await activeConsumer._cleanUp();
    // consumerNames should have both of the consumers
    expect(cleanupInfo.consumerNames).toEqual(expect.arrayContaining([faultyConsumerName, activeConsumerName]));

    // pendingConsumerNames should have faultyConsumerName since that's been disconnected before processing any task
    expect(cleanupInfo.pendingConsumerNames).toEqual(expect.arrayContaining([faultyConsumerName]));
    // pendingConsumerNames should not contain activeConsumerName since we processed the task
    expect(cleanupInfo.pendingConsumerNames).toEqual(expect.not.arrayContaining([activeConsumerName]));

    // emptyConsumerNames should not contain faultyConsumerName since that's been disconnected before processing any task
    expect(cleanupInfo.emptyConsumerNames).toEqual(expect.not.arrayContaining([faultyConsumerName]));
    // emptyConsumerNames should have activeConsumerName since we processed the task
    expect(cleanupInfo.emptyConsumerNames).toEqual(expect.arrayContaining([activeConsumerName]));

    // orphanWorkers should have faultyConsumerName since that's disconnected
    expect(cleanupInfo.orphanWorkers).toEqual(expect.arrayContaining([faultyConsumerName]));
    // orphanWorkers should not have activeConsumerName since that's still connected
    expect(cleanupInfo.orphanWorkers).toEqual(expect.not.arrayContaining([activeConsumerName]));

    // Most important part, activeConsumer should claim 1 unprocessed task from faultyConsumer
    expect(cleanupInfo.claimInfo).toEqual(
      expect.objectContaining({
        [faultyConsumerName]: 1
      })
    );
  });

  test('delete inactive and empty consumers', async () => {
    const qname = `queue-test-1`;

    const producer = new Producer(qname, { redisClient: redis });
    producers.push(producer);

    for (let i = 0; i < 2; i++) {
      const taskData = `test-data-${i + 1}`;
      await producer.addTask(taskData);
    }

    const consumerOptions = {
      taskBufferSize: 1,
      workerFnTimeoutMs: 5
    };

    const loggingOptions = {
      enabled: false
    };

    const faultyConsumer = new ConsumerUnit(qname, () => {}, { redisClient: redis, consumerOptions, loggingOptions });
    const activeConsumer = new ConsumerUnit(qname, () => {}, { redisClient: redis, consumerOptions, loggingOptions });
    consumers.push(activeConsumer);

    await waitUntilInitialized(faultyConsumer, '_isInitialized');
    await waitUntilInitialized(activeConsumer, '_isInitialized');

    const faultyConsumerName = faultyConsumer._name;

    await faultyConsumer._waitForTask();
    await activeConsumer._waitForTask();

    await faultyConsumer._getPendingTasks();
    await activeConsumer._getPendingTasks();

    await faultyConsumer._disconnect();
    await activeConsumer._processTask();

    // Wait for redis client to disconnect
    await delay(100);

    // First cleanup, take the task from faultyConsumer
    const cleanupInfo1 = await activeConsumer._cleanUp();

    // Wait for a while (min: workerFnTimeoutMs * 5) so that orkid consumer deletes orphanEmptyWorkers
    await delay(100);

    // Second cleanup, this time delete  faultyConsumer
    const cleanupInfo2 = await activeConsumer._cleanUp();

    // faultyConsumer should not be deleted at first cleanup since it's too soon
    expect(cleanupInfo1.emptyConsumerNames).toEqual(expect.not.arrayContaining([faultyConsumerName]));
    expect(cleanupInfo1.deleteInfo).toEqual(expect.not.arrayContaining([faultyConsumerName]));
    expect(cleanupInfo1.orphanEmptyWorkers).toEqual(expect.not.arrayContaining([faultyConsumerName]));

    // faultyConsumer should not be deleted at second cleanup
    expect(cleanupInfo2.emptyConsumerNames).toEqual([faultyConsumerName]);
    expect(cleanupInfo2.deleteInfo).toEqual([faultyConsumerName]);
    expect(cleanupInfo2.orphanEmptyWorkers).toEqual([faultyConsumerName]);
  });
});
