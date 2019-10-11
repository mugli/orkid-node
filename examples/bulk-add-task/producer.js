const { Producer } = require('orkid');

const producer = new Producer('bulk-add-example-queue');

async function addTasks() {
  // Each task in the array is a object with a mandatory data property
  // [{ data: 0}, { data: 1}, { data: 2}, ... { data: 999}]
  //
  // For de-duplication, you can optionally set dedupKey property too, like:
  //     [{ data: 0, dedupKey: "unique"}, { data: 1, dedupKey: "unique"}...]
  const tasks = Array.from({ length: 1000 }).map((_, i) => ({ data: i }));

  await producer.bulkAddTasks(tasks);
}

addTasks()
  .then(() => {
    console.log('Done');
    process.exit();
  })
  .catch(e => console.error(e));
