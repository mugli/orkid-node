const lodash = require('lodash');
const defaults = require('./defaults');

const defaultOptions = {
  redis: defaults.redis,
  logging: defaults.logging
};

let options;

function setOptions(userOptions) {
  options = lodash.merge({}, defaultOptions, userOptions);
}

function getOptions() {
  if (!options) {
    // Initialize
    setOptions();
  }

  return options;
}

module.exports = {
  getOptions,
  setOptions
};
