let config = {};

function setConfig(conf) {
  config = { ...config, ...conf };
}

module.exports = {
  config,
  setConfig
};
