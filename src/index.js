const prepareIoredis = require('./prepare-ioredis.js');

prepareIoredis();

const Producer = require('./producer');
const Consumer = require('./consumer');

module.exports = {
  Producer,
  Consumer
};
