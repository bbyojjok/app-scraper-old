const axios = require('axios');
const { createDetailModel } = require('./lib');

module.exports = async () => {
  try {
    const { data } = await axios.get('/sites');
    return data.reduce((acc, data) => {
      acc[data.name] = createDetailModel(data.name);
      return acc;
    }, {});
  } catch (err) {
    console.log(err);
    return false;
  }
};
