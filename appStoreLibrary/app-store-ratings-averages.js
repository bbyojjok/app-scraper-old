const axios = require('axios');
const cheerio = require('cheerio');

const appStoreRatingsAverages = async id => {
  try {
    const res = await axios.get(`https://itunes.apple.com/kr/app/id${id}`);
    const $ = cheerio.load(res.data);
    const ratingsAverages = $('.we-customer-ratings__averages__display').text();
    return ratingsAverages;
  } catch (err) {
    console.error(err);
    return err;
  }
};

module.exports = appStoreRatingsAverages;
