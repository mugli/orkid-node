const { Producer } = require('../../src/');

const tasks = [
  {
    id: 0,
    value: 'JcGDDE3A+jBGXEs'
  },
  {
    id: 1,
    value: 'AXuXUrzQi3kh>Xz'
  },
  {
    id: 0,
    value: 'JcGDDE3A+jBGXEs'
  },
  {
    id: 2,
    value: 'kxN#kXwjgqj2Pho'
  },
  {
    id: 0,
    value: 'JcGDDE3A+jBGXEs'
  }
];

const producer = new Producer('deduped-queue');

async function addTasks() {
  for (const task of tasks) {
    console.log('Adding task ', task);
    const added = await producer.addTask(task, task.id); // use id as deduplication key
    console.log(`Added? ${added ? `Yes! ID: ${added}` : 'Nope!'}`);
  }
}

addTasks()
  .then(() => {
    console.log('Done');
    process.exit();
  })
  .catch(e => console.error(e));
