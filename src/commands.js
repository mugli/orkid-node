async function initScripts(redis) {
  const pArr = [];

  pArr.push(
    redis.defineCommand('requeue', {
      numberOfKeys: 3,
      /*
        KEYS[1] = this.QNAME
        KEYS[2] = this.DEDUPSET
        KEYS[3] = this.GRPNAME

        ARGV[1] = task.id
        ARGV[2] = data
        ARGV[3] = dedupKey
        ARGV[4] = retryCount
      */
      lua: `
      local QNAME = KEYS[1] 
      local DEDUPSET = KEYS[2] 
      local GRPNAME = KEYS[3]

      local taskId = ARGV[1]
      local data = ARGV[2]
      local dedupKey = ARGV[3]
      local retryCount = ARGV[4]

      local retval
      if dedupKey == nil or dedupKey == '' then
        retval = redis.call("XADD", QNAME, "*", "data", data, "dedupKey", dedupKey, "retryCount", retryCount)
      else
        local exists = redis.call("SISMEMBER", DEDUPSET, dedupKey)
        if exists == 0 then
          redis.call("SADD", DEDUPSET, dedupKey)
          retval = redis.call("XADD", QNAME, "*", "data", data, "dedupKey", dedupKey, "retryCount", retryCount)
        else
          retval = nil
        end
      end

      redis.call("XACK", QNAME, GRPNAME, taskId)

      return retval
      `
    })
  );

  pArr.push(
    redis.defineCommand('enqueue', {
      numberOfKeys: 2,
      /*
        KEYS[1] = this.QNAME
        KEYS[2] = this.DEDUPSET

        ARGV[1] = data
        ARGV[2] = dedupKey
        ARGV[3] = retryCount
      */
      lua: `
      local QNAME = KEYS[1]
      local DEDUPSET = KEYS[2]

      local data = ARGV[1]
      local dedupKey = ARGV[2]
      local retryCount = ARGV[3]

      local retval
      if dedupKey == nil or dedupKey == '' then
        retval = redis.call("XADD", QNAME, "*", "data", data, "dedupKey", dedupKey, "retryCount", retryCount)
      else
        local exists = redis.call("SISMEMBER", DEDUPSET, dedupKey)
        if exists == 0 then
          redis.call("SADD", DEDUPSET, dedupKey)
          retval = redis.call("XADD", QNAME, "*", "data", data, "dedupKey", dedupKey, "retryCount", retryCount)
        else
          retval = nil
        end
      end

      return retval
      `
    })
  );

  pArr.push(
    redis.defineCommand('dequeue', {
      numberOfKeys: 3,
      /*
        KEYS[1] = this.QNAME
        KEYS[2] = this.DEDUPSET
        KEYS[3] = this.GRPNAME

        ARGV[1] = task.id
        ARGV[2] = dedupKey
      */
      lua: `
      local QNAME = KEYS[1]
      local DEDUPSET = KEYS[2]
      local GRPNAME = KEYS[3]
      
      local taskId = ARGV[1]
      local dedupKey = ARGV[2]
      
      if dedupKey ~= nil and dedupKey ~= '' then
        local exists = redis.call("SISMEMBER", DEDUPSET, dedupKey)
        if exists == 1 then
          redis.call("SREM", DEDUPSET, dedupKey)
        end
      end
      
      return redis.call("XACK", QNAME, GRPNAME, taskId)
      `
    })
  );

  pArr.push(
    redis.defineCommand('delconsumer', {
      numberOfKeys: 3,
      /*
        KEYS[1] = this.QNAME
        KEYS[2] = this.GRPNAME
        KEYS[3] = this.CONSUMER
      */
      lua: `
      local QNAME = KEYS[1]
      local GRPNAME = KEYS[2]
      local CONSUMER = KEYS[3]
      
      local consumers = redis.call("XINFO", "CONSUMERS", QNAME, GRPNAME)
      local consumerMap = {}

      for key, con in pairs(consumers) do
        local cMap = {}
        for i = 1, #con, 2 do
          cMap[con[i]] = con[i + 1]
        end

        print('cMap', cMap)

        consumerMap[cMap["name"]] = cMap
      end

      if consumerMap[CONSUMER] ~= nil and consumerMap[CONSUMER].pending == 0 then
        redis.call("XGROUP", "DELCONSUMER", QNAME, GRPNAME, CONSUMER)
      end
      `
    })
  );

  await Promise.all(pArr);
}

module.exports = initScripts;
