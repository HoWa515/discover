class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // set as an operational error
    Error.captureStackTrace(this, this.constructor); // make AppError show stacktrace
  }
}

module.exports = AppError;
