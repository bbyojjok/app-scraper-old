const route = require('express').Router();
const { getApi } = require('../lib');

route.get('/', async (req, res) => {
  const logingInfo = req.session.logingInfo || false;
  const sites = await getApi('/sites');
  const list =
    sites.length === 0
      ? false
      : sites.reduce((acc, data) => {
          acc.push({
            name: data.name,
            image: data.image
          });
          return acc;
        }, []);

  return res.render('index', { pathRoot: true, list, logingInfo });
});

route.get('/:site', async (req, res) => {
  const logingInfo = req.session.logingInfo || false;
  const site = req.params.site;

  switch (site) {
    case 'admin':
      if (logingInfo) {
        const sites = await getApi('/sites');
        return res.render('admin', { sites, logingInfo });
      } else {
        return res.redirect('/login');
      }
    case 'login':
      if (logingInfo) {
        return res.redirect('/');
      } else {
        return res.render('login', { logingInfo });
      }
    case 'logout':
      return req.session.destroy(err => {
        if (err) throw err;
        return res.redirect('/');
      });
    case undefined:
      return res.redirect('/');
    default:
      const list = await getApi('/sites');
      const target = list.filter(data => data.name === site);
      const image = target[0].image;
      return res.render('review', { site, image, logingInfo });
  }
});

module.exports = route;
