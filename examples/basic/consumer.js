const { Consumer } = require('../../src/');

const delay = time => new Promise(res => setTimeout(() => res(), time));

async function worker(data, metadata) {
  console.log(`Processing task from Queue: ${metadata.qname}. Task ID: ${metadata.id}. Data:`, data);
  await delay(1000);
  console.log(`Task ${metadata.id} done!`);
}

const consumer = new Consumer('basic', worker, { consumerOptions: { concurrency: 2 } });
consumer.start();
