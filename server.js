const dotenv = require('dotenv');
const mongoose = require('mongoose');

// handle uncaughtException
process.on('uncaughtException', (err) => {
  console.log('Uncaught exception! App shutting down...💤');
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');
// con to atlas
const DB = process.env.DATABASE;
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then((con) => {
    console.log(con.connections);
    console.log('Atlas has connected');
  });

//  start server
const port = process.env.PORT || 8000;
const server = app.listen(port, () => {
  console.log(`App is running on port ${port}`);
});

// Handle DB connection fials and other rejected promises globally
process.on('unhandledRejection', (err) => {
  // listen unhandledRejection evnet
  console.log('Unhandled rejection! App shutting down....💤');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1); // 1 stands for uncaught exception; 0 stands success
  });
});
