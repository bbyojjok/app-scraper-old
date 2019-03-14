const route = require('express').Router();
const sites = require('../../schedule/sites');

route.get('/', (req, res) => {
  const list = sites.reduce((acc, data) => {
    acc.push(data.name);
    return acc;
  }, []);
  res.render('index', { list: list });
});

route.get('/:site', (req, res) => {
  const site = req.params.site;
  res.render('review', { site });
});

module.exports = route;
