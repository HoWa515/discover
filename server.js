const dotenv = require('dotenv');

dotenv.config({ path: './config.env' });
const app = require('./app');
// console.log(process.env.NODE_ENV);
//  start server

const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`App runs on port ${port}`);
});
