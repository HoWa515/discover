const AppError = require('../utils/appError');

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  // operational error
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    // Programming error unknown, don't leak to the client
    console.error('Error 💥', err);
    res.status(500).json({
      status: 'error',
      message: 'Something is wrong.',
    });
  }
};

// ================================================
// mongoose error mark as operational by AppError
//==================================================
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path} ${err.value}`;
  return new AppError(message, 400);
};
const handleDuplicateFieldDB = (err) => {
  const message = `Duplicate field ${err.keyValue.name}`;
  return new AppError(message, 400);
};
const handleValidationErrorDB = (err) => {
  const message = `Invalid input data`;
  return new AppError(message, 400);
};

// gloabal error handling middleware
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    // CastError: invalid id
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    // Duplicate key
    if (error.code === 11000) error = handleDuplicateFieldDB(error);
    // validation error
    if (error.name === 'ValidationError')
      error = handleValidationErrorDB(error);

    sendErrorProd(error, res);
  }
};
