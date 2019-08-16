class TimeoutError extends Error {
  constructor(...args) {
    super(...args);
    Error.captureStackTrace(this, TimeoutError);
  }
}

class InvalidConfigError extends Error {
  constructor(...args) {
    super(...args);
    Error.captureStackTrace(this, InvalidConfigError);
  }
}

module.exports = {
  InvalidConfigError,
  TimeoutError
};
