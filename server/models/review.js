const axios = require('axios');
const { createReviewModel } = require('./lib');

module.exports = (async () => {
  const sites = await axios
    .get('/sites')
    .then(res => res.data)
    .catch(err => false);
  return sites.reduce((acc, data) => {
    acc[data.name] = createReviewModel(data.name);
    return acc;
  }, {});
})();
