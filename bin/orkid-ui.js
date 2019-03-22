#!/usr/bin/env node

// TODO: Take config args from cli

const prepareIoredis = require('../src/prepare-ioredis.js');
prepareIoredis();
const IORedis = require('ioredis');
const orkidUI = require('orkid-ui');

const redis = new IORedis();
const express = orkidUI(redis);

express.listen(3000, '0.0.0.0', () => {
  console.log(`Orkid UI ready at http://localhost:3000`);
});
