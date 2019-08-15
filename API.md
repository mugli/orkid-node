# API Documentation

# Table of Contents

- [Producer](#producer)
  - [Creating a producer for a queue](#creating-a-producer-for-a-queue)
  - [Adding tasks to queue with or without de-duplication](#adding-tasks-to-queue-with-or-without-de-duplication)
- [Consumer](#consumer)
  - [Creating consumers for a queue](#creating-consumers-for-a-queue)
  - [The Worker Function](#the-worker-function)
  - [Starting consumers](#starting-consumers)
  - [Pausing/resuming consumers](##pausingresuming-consumers)

---

## Producer

```js
const { Producer } = require('orkid');
```

---

### Creating a producer for a queue

- **Many producers can send jobs to a single queue.**
- **For more queues, create separate instances of producers with separate `qname`.**

Producers can be used after instantiating `Producer` class.

```js
const producer = new Producer(qname, [options]);
```

**Parameters:**

`qname`:

- Queue name.
- String.
- Required.

`options`:

- Producer options.
- Object.
- Optional.

```
`options`: {
  `redisClient`:

    - Instance of `ioredis` which will be used to duplicate configs to create a new redis connection.
    - `redisClient` is used over `redisOptions` if both are present.
    - Optional.


  `redisOptions`:

    - Object.
    - Any valid `ioredis` options.
    - Optional.
}
```

If `options` is omitted or `redisClient` and `redisOptions` are not present, `ioredis` defaults will be used, as described here: https://github.com/luin/ioredis/blob/master/API.md#new_Redis_new

**Return value:**

Returns an instance of `Producer`.

---

### Adding tasks to queue with or without de-duplication

```js
// producer is a `Producer` instance
await producer.addTask(data, [dedupKey]);
```

**Parameters:**

`data`

- Object, string or any type that can be passed through `JSON.stringify()`. Will be parsed again by `JSON.parse()` before passing to the [worker function](#the-worker-function) of the consumer.
- `null` will be used if absent.

`dedupKey`

- String.
- Optional.
- Use if you need task de-duplication.
- If a **still unprocessed/pending** tasks are present in the queue with the same `dedupKey`, calling `producer.addTask()` WILL NOT add the task again.
- Notice the **still unprocessed/pending** qualifier for de-duplication. If there were tasks previously in the queue with the same `dedupKey` but have been processed already, calling `producer.addTask()` will add the tasks as usually. De-duplication only happens in pending tasks level. Tasks that are waiting to be retried after failure are considered pending too.

**Return value:**

Returns `Promise <string | null>`

- If the task **WAS NOT** added due to **de-duplication**: `Promise<null>`
- If the task was added: `Promise<string>`. String can be any auto-generated ID.

---

## Consumer

```js
const { Consumer } = require('orkid');
```

---

### Creating consumers for a queue

---

### The Worker Function

---

### Starting consumers

---

### Pausing/resuming consumers

---

### Notes on consumer concurrency

---

### Notes on task order
