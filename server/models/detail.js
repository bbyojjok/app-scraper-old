const axios = require('axios');
const { createDetailModel } = require('./lib');

module.exports = (async () => {
  const sites = await axios
    .get('/sites')
    .then(res => res.data)
    .catch(err => false);
  return sites.reduce((acc, data) => {
    acc[data.name] = createDetailModel(data.name);
    return acc;
  }, {});
})();
