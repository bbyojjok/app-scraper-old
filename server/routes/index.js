const route = require('express').Router();
const view = require('./view');
const api = require('./api');

route.use('/', view);
route.use('/api', api);

module.exports = route;
