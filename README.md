# orkid

[![NPM version](https://img.shields.io/npm/v/orkid.svg)](https://www.npmjs.com/package/orkid)
![](https://img.shields.io/david/mugli/orkid.svg?style=flat)
![](https://img.shields.io/david/dev/mugli/orkid.svg?style=flat)
![](https://img.shields.io/node/v/orkid.svg?style=flat)
![](https://img.shields.io/npm/l/orkid.svg?style=flat)

Reliable and modern [Redis-streams](https://redis.io/topics/streams-intro) based task queue for Node.js.

# Screenshot

![screenshot](https://raw.githubusercontent.com/mugli/orkid-node/master/screenshot.png)

# Table of Contents

- [Why another job queue for Node.js](#why-a-new-job-queue-for-nodejs)
- [Features](#features)
- [Requirements](#requirements)
- [Install](#install)
- [Examples](#examples)
- [Monitoring and Management UI/Admin Panel](#monitoring-and-management-ui-admin-panel)
- [FAQ](#faq)

# Why a new job queue for Node.js

- All the redis-based solutions were created before [Redis-streams](https://redis.io/topics/streams-intro) became available. They all require a lot of work on the queue-side to ensure durability and atomicity of jobs. Redis streams was specifically designed to made this kind of tasks easier, thus allows simpler core in the queue and more reliable operations.

- None of existing usable job queues in Node.js offers a monitoring option that we liked.

- None of the existing usable task queues support task deduplication.

# Features

- [x] Orkid lets Redis do the heavy lifting with [redis streams](https://redis.io/topics/streams-intro).
- [x] **Adjustable concurrency** per consumer instance for scaling task processing. See example code. [See example code](https://github.com/mugli/orkid-node/tree/master/examples/basic).
- [x] Job **timeouts** and **retries**. All configurable per consumer. [See example code](https://github.com/mugli/orkid-node/tree/master/examples/failure-timeout-retry).
- [x] Task **Deduplication**. If a task is already waiting in the queue, it can be configured to avoid queueing the same task again. _(Useful for operations like posting database record updates to elasticsearch for re-indexing. Deduplication is a common pattern here to avoid unnecessary updates)_. [See example code](https://github.com/mugli/orkid-node/tree/master/examples/deduplication).
- [ ] Monitoring and management **UI** for better visibility.
- [ ] Cron-like **scheduled job** producing. This is different than queueing task now and executing it later. Instead the producer function will be called later at a particular time to produce task. If multiple instances of the application is running, Orkid will ensure that only one producer function gets called.
- [ ] **Rate-limiting** workers.

# Requirements

- Node.js >= 10
- Redis >= 5

👏 **Important**: [Redis-streams](https://redis.io/topics/streams-intro) was not available before **Redis 5**! Please make sure you are meeting the requirement here.

# Install

```
npm install orkid --save
```

# Examples

Basic example of producing and consuming tasks:

Producing tasks:

```js
const { Producer } = require('orkid');

// `basic` is the name of the queue here
//  We'll use the same name in the consumer to process this task
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
    process.exit(); // Disconnect from redis
  })
  .catch(e => console.error(e));
```

Consuming tasks:

```js
const { Consumer } = require('orkid');

// Worker Function
async function workerFn(data, metadata) {
  let result;
  /*
    Do operation on `data` here
    and store the result in `result` variable
  */

  console.log('Task done!');
  return result;
}

// Consume task from the `basic` queue
const consumer = new Consumer('basic', workerFn);

// Start processing tasks!
consumer.start();
```

👏 **More examples are available in [./examples](https://github.com/mugli/orkid-node/tree/master/examples) directory.**

# Monitoring and Management UI/Admin Panel

![screenshot](https://raw.githubusercontent.com/mugli/orkid-node/master/screenshot.png)
![screenshot](https://raw.githubusercontent.com/mugli/orkid-node/master/screenshot-2.png)

[TODO: Description]

# Task/job lifecycle

[TODO: Add a flowchart here]

# FAQ

<details>
  <summary>Is this production ready?</summary>
  Not yet.
</details>

<p></p>

<details>
  <summary>How do I set priority in the tasks?</summary>
  Redis Streams isn't a suitable primitive to make a priority queue efficiently on top of it. Orkid doesn't support priority queues now and probably never will.

However, as a workaround, you can create a separate queue, keep its workload minimal and use it for high priority jobs with Orkid.

</details>

<p></p>

<details>
  <summary>What is the order of job/task delivery?</summary>
  Jobs are processed in the order they are produced. However, if retry option is turned on and is applicable, failed jobs gets enqueued to the queue at once, along with other newly produced jobs. 
</details>

<p></p>

## Authors

- Mehdi Hasan Khan (Twitter: [@MehdiHK](https://twitter.com/MehdiHK))

## License

MIT
