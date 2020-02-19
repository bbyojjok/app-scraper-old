const googlePlay = require('google-play-scraper');
const appStore = require('app-store-scraper');

const validationGooglePlayAppId = async googlePlayAppId => {
  try {
    return await googlePlay.app({ appId: googlePlayAppId, lang: 'ko', country: 'kr' });
  } catch (err) {
    return false;
  }
};

const validationAppStoreId = async appStoreId => {
  try {
    return await appStore.app({ id: appStoreId, country: 'kr' });
  } catch (err) {
    return false;
  }
};

const validationAppid = async ({ googlePlayAppId, appStoreId }) => {
  try {
    if (!(await validationGooglePlayAppId(googlePlayAppId))) {
      return { failure: 'googlePlayAppId' };
    }
    if (!(await validationAppStoreId(appStoreId))) {
      return { failure: 'appStoreId' };
    }
    return { success: true };
  } catch (err) {
    console.error(err);
    return err;
  }
};

module.exports = validationAppid;
