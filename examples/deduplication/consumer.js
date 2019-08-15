const { Consumer } = require('orkid');

const delay = time => new Promise(res => setTimeout(() => res(), time));

async function worker(data, metadata) {
  console.log(`Processing task from Queue: ${metadata.qname}. Data:`, data);
  await delay(1000);
  const result = Math.random();
  console.log(`Task done!`);
  return result;
}

const consumer = new Consumer('deduped-queue', worker, { consumerOptions: { concurrencyPerInstance: 1 } });
consumer.start();
