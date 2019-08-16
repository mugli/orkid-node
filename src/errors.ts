export class TimeoutError extends Error {
  constructor(...args: string[]) {
    super(...args);
    Error.captureStackTrace(this, TimeoutError);
  }
}

export class InvalidConfigError extends Error {
  constructor(...args: string[]) {
    super(...args);
    Error.captureStackTrace(this, InvalidConfigError);
  }
}
