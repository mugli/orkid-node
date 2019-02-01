const { Consumer } = require('../../src/');

const delay = time => new Promise(res => setTimeout(() => res(), time));

async function worker(data, metadata) {
  console.log(`Processing task from Queue: ${metadata.qname}. Task ID: ${metadata.id}. Data:`, data);

  const fate = Math.random();

  // Simulating crash
  if (fate < 0.3) {
    throw new Error('Worker: Simulating worker error');
  }

  // Simulating timeout
  if (fate >= 0.3 && fate <= 0.6) {
    await delay(20000);
  }

  await delay(2000);

  // Success
  console.log(`Task ${metadata.id} done!`);
  const result = Math.random();
  return result;
}

const consumer = new Consumer('basic', worker, {
  consumerOptions: { concurrencyPerInstance: 1, maxRetry: 1, workerFnTimeoutMs: 3000 }
});
consumer.start();
