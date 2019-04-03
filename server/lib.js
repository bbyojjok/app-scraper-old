const axios = require('axios');

/**
 * axios request
 * @param { String } url
 */
function getApi(url) {
  return new Promise((resolve, reject) => {
    axios
      .get(url)
      .then(res => {
        resolve(res.data);
      })
      .catch(err => {
        console.log('ERROR:', err);
        reject(err);
      });
  });
}

const getIpAddress = req => {
  let ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress).split(':').pop();
  return ip;
};

module.exports = { getApi, getIpAddress };
