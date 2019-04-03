const googlePlay = require('google-play-scraper');
const appStore = require('app-store-scraper');

function validationGooglePlayAppId({ googlePlayAppId, appStoreId }) {
  return new Promise((resolve, reject) => {
    // 구글플레이
    googlePlay
      .app({ appId: googlePlayAppId, lang: 'ko', country: 'kr' })
      .then(res => {
        resolve({ googlePlayAppId, appStoreId });
      })
      .catch(err => {
        reject({ failure: 'googlePlayAppId' });
      });
  });
}

function validationAppStoreId({ googlePlayAppId, appStoreId }) {
  return new Promise((resolve, reject) => {
    // 앱스토어
    appStore
      .app({ id: appStoreId, country: 'kr' })
      .then(res => {
        resolve({ googlePlayAppId, appStoreId });
      })
      .catch(err => {
        reject({ failure: 'appStoreId' });
      });
  });
}

function validationAppid({ googlePlayAppId, appStoreId }) {
  return new Promise((resolve, reject) => {
    validationGooglePlayAppId({ googlePlayAppId, appStoreId })
      .then(validationAppStoreId)
      .then(() => {
        resolve({ success: true });
      })
      .catch(err => {
        resolve(err);
      });
  });
}

module.exports = validationAppid;
