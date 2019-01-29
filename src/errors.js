class TimeoutError extends Error {
  constructor(...args) {
    super(...args);
    Error.captureStackTrace(this, TimeoutError);
  }
}

module.exports = {
  TimeoutError
};
