const path = require('path');
const route = require('express').Router();
const api = require('./api');

route.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../', 'views/index.html'));
});
route.use('/api', api);

module.exports = route;
