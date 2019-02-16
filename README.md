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

- The existing solutions is not very promising. `Automattic/kue` was very popular once, but [became unmaintained](https://github.com/Automattic/kue/issues/1196). `OptimalBits/bull` is another popular solution, but not without [major issues](https://github.com/OptimalBits/bull/issues/742) that has caused problems like lots of duplicate tasks in production, resulting in duplicate SMS/emails and unhappy customers.

- All the redis-based solution till the release of Orkid was created before [Redis-streams](https://redis.io/topics/streams-intro) was released. They all require a lot of tasks on the queue-side to ensure durability and atomicity of jobs. Redis streams was specifically designed to made this kind of tasks easier, thus allows simpler core in the queue and more reliable operations.

- None of existing job queues in Node.js offers a _mature_ and _production-ready_ monitoring UI. Other ecosystems had them for years. Orkid takes observability seriously.

- None of the existing task queues support task deduplication, that we needed.

# Features

- [x] Adjustable concurrency per queue
- [x] Job timeouts and retries
- [x] Deduplication. _(Useful for operations like posting database record updates to elasticsearch for reindexing)_
- [ ] Monitoring and management UI
- [ ] Cron-like scheduled job producing.
- [ ] Producing/consuming jobs from multiple programming languages.

# Requirements

- Node.js >= 10
- Redis >= 5

👏 **Important**: [Redis-streams](https://redis.io/topics/streams-intro) was not available before Redis 5! Please make sure you are meeting the requirement here.

# Install

```
npm install orkid --save
```

# Examples

Basic example of producing and consuming tasks:

Producing tasks:

```
const { Producer } = require('orkid');

// basic is the queue name here
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

```

Consuming tasks:

```
const { Consumer } = require('orkid');

async function workerFn(data, metadata) {
  let result;
  /*
    Do operation on `data` here
    and store result in `result` variable
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

# FAQ

<details>
  <summary>How do I set priority in the tasks?</summary>
  [TODO: ]
</details>

<p></p>

<details>
  <summary>How to ensure durability in Redis?</summary>
  [TODO: ]
</details>

## Authors

- Mehdi Hasan Khan ([@MehdiHK](https://twitter.com/MehdiHK))

## License

MIT
