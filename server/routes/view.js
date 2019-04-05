const route = require('express').Router();
const { getApi } = require('../lib');

route.get('/', async (req, res) => {
  let { logingInfo } = req.session;
  if (logingInfo === undefined) {
    logingInfo = false;
  }

  const sites = await getApi('http://127.0.0.1:889/api/sites');
  let list = sites.reduce((acc, data) => {
    acc.push({
      name: data.name,
      image: data.image
    });
    return acc;
  }, []);
  if (list.length === 0) {
    list = false;
  }
  res.render('index', { pathRoot: true, list, logingInfo });
});

route.get('/:site', async (req, res) => {
  const site = req.params.site;
  let { logingInfo } = req.session;
  if (logingInfo === undefined) {
    logingInfo = false;
  }

  switch (site) {
    case 'admin':
      if (typeof logingInfo === 'object') {
        let sites = await getApi('http://127.0.0.1:889/api/sites');
        return res.render('admin', { sites, logingInfo });
      } else {
        return res.redirect('/login');
      }
    case 'login':
      return res.render('login', { logingInfo });
    case undefined:
      return res.redirect('/');
    default:
      let list = await getApi('http://127.0.0.1:889/api/sites');
      let target = list.filter((data, i) => {
        return data.name === site;
      });
      let image = target[0].image;
      return res.render('review', { site, image, logingInfo });
  }
});

module.exports = route;
