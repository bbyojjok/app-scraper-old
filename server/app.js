const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cors = require('cors');
const route = require('./routes');
const scheduler = require('../schedule/scrap');
const port = 999;
const mongoose = require('mongoose');
const { connection } = mongoose;

connection.on('error', console.error);
connection.once('open', () => {
  console.log('[DB] Connected to mongodb server');
});
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://127.0.0.1:27017/app-scraper', { useNewUrlParser: true });

app.use(helmet());
app.use(compression());
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/', express.static(path.join(__dirname, '/public')));
app.use('/', route);

app.listen(port, () => {
  console.log(`[SERVER] Express is listening on port ${port}`);
  scheduler();
});
