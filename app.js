const express = require('express');
const morgan = require('morgan');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const app = express();
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

//  global middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(express.json());

app.use(express.static('./public'));

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// routes
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
// handle undefined routes
app.all('*', (req, res, next) => {
  const err = new AppError(`Can't find ${req.originalUrl}`, 404);
  next(err);
});

app.use(globalErrorHandler);

module.exports = app;
