const prepareIoredis = require('./prepare-ioredis.js');
prepareIoredis();

const Producer = require('./producer');
const Consumer = require('./consumer');
const config = require('./config');

module.exports = {
  Producer,
  Consumer,
  config
};
