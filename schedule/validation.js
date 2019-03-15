const googlePlay = require('google-play-scraper');
const appStore = require('app-store-scraper');

/**
 * TODO
 * @param {} appId
 */

function validationAndroidAppId(appId) {
  return new Promise((resolve, reject) => {
    // 구글플레이
    googlePlay
      .app({ appId: appId, lang: 'ko', country: 'kr' })
      .then(res => {
        resolve({ googlePlay: true });
      })
      .catch(err => {
        reject(err);
      });
  });
}

function validationAppStoreId(appId) {
  return new Promise((resolve, reject) => {
    // 앱스토어
    appStore
      .app({ id: appId, country: 'kr' })
      .then(res => {
        resolve({ appStore: true });
      })
      .catch(err => {
        reject(err);
      });
  });
}

function validationAppid({ androidAppId, appStoreId }) {
  return new Promise((resolve, reject) => {});
}

module.exports = validationAppid;
