<h1 align="center">
<img src="https://raw.github.com/mugli/orkid-node/master/orkid.svg?sanitize=true" width="150px" height="150px" /><br />
orkid</h1>

<!-- [![codecov](https://codecov.io/gh/mugli/orkid-node/branch/master/graph/badge.svg)](https://codecov.io/gh/mugli/orkid-node) -->

[![NPM version](https://img.shields.io/npm/v/orkid.svg)](https://www.npmjs.com/package/orkid)
[![Build Status](https://img.shields.io/circleci/build/github/mugli/orkid-node/master?token=9e4999a9e95ab359bb1b458bbaed97985308a704)](https://circleci.com/gh/mugli/orkid-node)
![Code Coverage](https://raw.github.com/mugli/orkid-node/master/badges/badge-lines.svg?sanitize=true)
![Dependencies](https://img.shields.io/david/mugli/orkid.svg?style=flat)
![Dev Dependencies](https://img.shields.io/david/dev/mugli/orkid.svg?style=flat)
![Required Node](https://img.shields.io/node/v/orkid.svg?style=flat)
![License](https://img.shields.io/npm/l/orkid.svg?style=flat)

Reliable and modern [Redis-Streams](https://redis.io/topics/streams-intro) based task queue for Node.js.

---

# Screenshot

![screenshot](https://raw.githubusercontent.com/mugli/orkid-node/master/screenshot.png)

---

# Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Install](#install)
- [Examples](#examples)
- [API Documentation](#api-documentation)
- [Monitoring and Management UI/Admin Panel](#monitoring-and-management-ui-admin-panel)
- [FAQ](#faq)

---

# Features

- [x] Orkid lets Redis do the heavy lifting with [Redis-Streams](https://redis.io/topics/streams-intro).
- [x] **Adjustable concurrency** per consumer instance for scaling task processing. See example code. [See example code](https://github.com/mugli/orkid-node/tree/master/examples/basic).
- [x] Job **timeouts** and **retries**. All configurable per consumer. [See example code](https://github.com/mugli/orkid-node/tree/master/examples/failure-timeout-retry).
- [x] Task **Deduplication**. If a task is already waiting in the queue, it can be configured to avoid queueing the same task again. _(Useful for operations like posting database record updates to elasticsearch for re-indexing. Deduplication is a common pattern here to avoid unnecessary updates)_. [See example code](https://github.com/mugli/orkid-node/tree/master/examples/deduplication).
- [x] Monitoring and management **UI** for better visibility.
  <!-- - [ ] Cron-like **scheduled job** producing. This is different than queueing task now and executing it later. Instead the producer function will be called later at a particular time to produce task. If multiple instances of the application is running, Orkid will ensure that only one producer function gets called. -->
- [ ] **Rate-limiting** workers. (_work in progress_)

---

# Requirements

- Node.js >= 10
- Redis >= 5

👏 **Important**: [Redis-Streams](https://redis.io/topics/streams-intro) feature is not available before **Redis version 5**.

---

# Install

```
npm install orkid --save
```

---

# Examples

Basic example of producing and consuming tasks:

Producing tasks:

```js
const { Producer } = require('orkid');

// `basic` is the queue name here
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
    process.exit(); // To disconnect from redis
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

    Anything you return from this function will
    be saved in redis and can be viewed in the Orkid UI.

    Returning nothing is fine too.

    Throwing error will mark the job as failed,
    which can be retried too.
  */

  console.log('Task done!');
  return result;
}

// Consume task from the `basic` queue
const consumer = new Consumer('basic', workerFn);

// Start processing tasks!
// Important: Until you call this method, orkid consumer will do nothing.
consumer.start();
```

> 👏 **More examples are available in the [./examples](https://github.com/mugli/orkid-node/tree/master/examples) directory, including how to do task de-duplication, retry on failure, timeout etc.** 👏

---

# API Documentation

**API Documentation is [available here](https://github.com/mugli/orkid-node/blob/master/API.md).**

---

# Monitoring and Management UI/Admin Panel

![screenshot](https://raw.githubusercontent.com/mugli/orkid-node/master/screenshot.png)
![screenshot](https://raw.githubusercontent.com/mugli/orkid-node/master/screenshot-2.png)

> You need to run `orkid-ui` separately for the dashboard. Detail instructions on how to run `orkid-ui` locally or in production using docker/docker-compose can be found here:
> https://github.com/mugli/orkid-ui#running-locally

---

# Task/job life-cycle

[TODO: Add a flowchart here]

---

# FAQ

<details>
  <summary>Is this production ready?</summary>
  This project is under active development right now. API may introduce breaking changes until we reach version 1.0. After that semantic versioning will be followed.
</details>

<p></p>

<details>
  <summary>Why a new job queue for Node.js?</summary>
  All the redis-based solutions were created before [Redis-Streams](https://redis.io/topics/streams-intro) became available. They all require a lot of work on the queue-side to ensure durability and atomicity of jobs. Redis-Streams was specifically designed to made this kind of tasks easier, thus allows simpler core in the queue and more reliable operations.

None of existing usable job queues in Node.js offers a monitoring option that we liked.

None of the existing usable task queues support task de-duplication.

</details>

<p></p>

<details>
  <summary>How do I set priority in the tasks?</summary>
  Redis-Streams isn't a right primitive to make a priority queue efficiently on top of it. Orkid doesn't support priority queues now and probably never will.

However, as a workaround, you can create a separate queue, keep its workload minimal and use it for high priority jobs with Orkid.

</details>

<p></p>

<details>
  <summary>What is the order of job/task delivery?</summary>
  Jobs are processed in the order they are produced. However, if retry option is turned on and is applicable, failed jobs gets enqueued to the queue at once, along with other newly produced jobs. 
</details>

<p></p>

---

## Maintainer(s)

- Mehdi Hasan Khan ([@MehdiHK](https://twitter.com/MehdiHK))

---

## License

MIT

---

### Related Projects

- [orkid-ui](https://github.com/mugli/orkid-ui): Dashboard to monitor and manage Orkid task queue.
- [orkid-api](https://github.com/mugli/orkid-api): GraphQL API to monitor and manage Orkid task queue (used internally by orkid-ui).
