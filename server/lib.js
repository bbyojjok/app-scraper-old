const axios = require('axios');

/**
 * axios get request
 * @param { String } url
 */
const getApi = async url => {
  try {
    const { data } = await axios.get(url);
    return data;
  } catch (err) {
    console.log('ERROR:', err);
  }
};

/**
 * get ip address
 * @param { Object } req
 */
const getIpAddress = req => {
  return (req.headers['x-forwarded-for'] || req.connection.remoteAddress).split(':').pop();
};

module.exports = { getApi, getIpAddress };
