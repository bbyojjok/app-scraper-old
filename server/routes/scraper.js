const route = require('express').Router();

route.get('/', (req, res) => {
  res.send('hello world');
});

module.exports = route;
