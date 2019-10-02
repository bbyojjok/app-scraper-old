const axios = require('axios');
const { createReviewModel } = require('./lib');

module.exports = async () => {
  try {
    const { data } = await axios.get('/sites');
    return data.reduce((acc, data) => {
      acc[data.name] = createReviewModel(data.name);
      return acc;
    }, {});
  } catch (err) {
    console.log(err);
    return false;
  }
};
