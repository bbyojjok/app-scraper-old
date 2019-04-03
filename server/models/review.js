const { createReviewModel } = require('./lib');
const axios = require('axios');

module.exports = (async () => {
  const sites = await axios
    .get('http://127.0.0.1:889/api/sites')
    .then(res => {
      return res.data;
    })
    .catch(err => {
      return false;
    });
  return sites.reduce((acc, data, idx) => {
    acc[data.name] = createReviewModel(data.name);
    return acc;
  }, {});
})();
