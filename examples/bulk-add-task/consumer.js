const { Consumer } = require('orkid');

async function worker(data, metadata) {
  console.log(`Processing task from Queue: ${metadata.qname}. Task ID: ${metadata.id}. Data:`, data);
  const result = Math.random();
  console.log(`Task ${metadata.id} done!`);
  return result;
}

const consumer = new Consumer('bulk-add-example-queue', worker, { consumerOptions: { concurrencyPerInstance: 50 } });
consumer.start();
