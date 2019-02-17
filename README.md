# orkid

[![NPM version](https://img.shields.io/npm/v/orkid.svg)](https://www.npmjs.com/package/orkid)
![](https://img.shields.io/david/mugli/orkid.svg?style=flat)
![](https://img.shields.io/david/dev/mugli/orkid.svg?style=flat)
![](https://img.shields.io/node/v/orkid.svg?style=flat)
![](https://img.shields.io/npm/l/orkid.svg?style=flat)

Reliable and modern [Redis-streams](https://redis.io/topics/streams-intro) based task queue for Node.js.

# Screenshot

[TODO: ]

# Table of Contents

- [Why a new job/task queue for Node.js](#why-a-new-job-task-queue-for-nodejs)
- [Features](#features)
- [Requirements](#requirements)
- [Install](#install)
- [Examples](#examples)
- [Monitoring and Management UI/Admin Panel](#monitoring-and-management-ui-admin-panel)
- [FAQ](#faq)

# Why a new job/task queue for Node.js

- The existing solutions are not very promising. [`Automattic/kue`](https://github.com/Automattic/kue) was very popular once, but apperantly [became unmaintained](https://github.com/Automattic/kue/issues/1196). We were happy with [`OptimalBits/bull`](https://github.com/OptimalBits/bull) until one day we were caught by a documentation bug ([related to this one](https://github.com/OptimalBits/bull/issues/742)) resulting in lots of duplicate SMS/emails and unhappy customers, eroding our trust in the queue.

- All the redis-based solutions (till the release of Orkid) were created before [Redis-streams](https://redis.io/topics/streams-intro) was available. They all require a lot of tasks on the queue-side to ensure durability and atomicity of jobs. Redis streams was specifically designed to made this kind of tasks easier, thus allows simpler core in the queue and more reliable operations.

- None of existing job queues in Node.js offers a _mature_ and _production-ready_ monitoring UI. Other ecosystems had them for years. Orkid takes observability seriously.

- None of the existing task queues support task deduplication, that we needed.

# Features

- [x] Orkid let Redis do the heavy lifting with [redis streams](https://redis.io/topics/streams-intro).
- [x] Uses [`luin/ioredis`](https://github.com/luin/ioredis) for connection, so supports redis single instance, redis cluster, redis sentinel.
- [x] **Adjustable concurrency** per consumer instance. See example code. [See example code](https://github.com/mugli/orkid-node/tree/master/examples/basic).
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

[TODO: ]

# Task/job lifecycle

[TODO: Add a flowchart here]

# FAQ

<details>
  <summary>Is this production ready?</summary>
  Nope! Not yet :)
</details>

<p></p>

<details>
  <summary>How do I set priority in the tasks?</summary>
  [TODO: ]
</details>

<p></p>

<details>
  <summary>Why Redis and not 'X'?</summary>
  [TODO: ]
</details>

<p></p>

<details>
  <summary>Why Redis streams and not list/sorted-set/pub-sub etc?</summary>
  [TODO: ]
</details>

<p></p>

<details>
  <summary>What delivery guarantee does Redis streams provide (`at-least once`/`best-effort`/`exactly-once`)?</summary>
  [TODO: ]
</details>

<p></p>

<details>
  <summary>How do I ensure durability/persistence in Redis?</summary>
  [TODO: ]
</details>

<p></p>

<details>
  <summary>How do I ensure high availability in Redis?</summary>
  [TODO: ]
</details>

## Authors

- Mehdi Hasan Khan (Twitter: [@MehdiHK](https://twitter.com/MehdiHK))

## License

MIT
