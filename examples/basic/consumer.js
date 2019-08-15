const { Consumer } = require('orkid');

const delay = time => new Promise(res => setTimeout(() => res(), time));

async function worker(data, metadata) {
  console.log(`Processing task from Queue: ${metadata.qname}. Task ID: ${metadata.id}. Data:`, data);
  await delay(1000);
  const result = Math.random();
  console.log(`Task ${metadata.id} done!`);
  return result;
}

const consumer = new Consumer('basic', worker, { consumerOptions: { concurrencyPerInstance: 2 } });
consumer.start();
