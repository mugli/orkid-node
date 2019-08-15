const { Producer } = require('orkid');

const producer = new Producer('retriable-queue');

async function addTasks() {
  for (let i = 0; i < 5; i++) {
    console.log('Adding task ', i);
    await producer.addTask(i);
  }
}

addTasks()
  .then(() => {
    console.log('Done');
    process.exit();
  })
  .catch(e => console.error(e));
