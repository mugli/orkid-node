const { Producer } = require('../../src/');

const producer = new Producer('basic');

async function addTasks() {
  for (let i = 0; i < 10; i++) {
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
