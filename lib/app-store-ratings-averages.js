const axios = require('axios');
const cheerio = require('cheerio');

const AppStoreRatingsAverages = id => {
  return new Promise((resolve, reject) => {
    const url = `https://itunes.apple.com/kr/app/id${id}`;
    axios
      .get(url)
      .then(res => {
        const $ = cheerio.load(res.data);
        const ratingsAverages = $('.we-customer-ratings__averages__display').text();
        resolve(ratingsAverages);
      })
      .catch(err => {
        reject(err);
      });
  });
};

module.exports = AppStoreRatingsAverages;
