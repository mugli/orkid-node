const prepareIoredis = require('./prepare-ioredis.js');
prepareIoredis();

const Producer = require('./producer');
const Consumer = require('./consumer');

const options = require('./options');

function init(userOptions) {
  options.setOptions(userOptions);
}

module.exports = {
  Producer,
  Consumer,
  init
};
