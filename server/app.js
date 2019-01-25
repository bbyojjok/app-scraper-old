const appStore = require('app-store-scraper');
const googlePlay = require('google-play-scraper');
const info = {
  appStore: {
    id: 870397981
  },
  googlePlay: {
    appId: 'com.hmallapp'
  }
};

// =================== 앱스토어 ===================

/*
// 앱 정보
appStore
  .app({ id: info.appStore.id, country: 'kr' })
  .then(data => {
    console.log(data);
  })
  .catch(data => {
    console.log(data);
  });
*/

// 리뷰
appStore
  .reviews({ id: info.appStore.id, country: 'kr', page: 1 })
  .then(data => {
    console.log('=================== 앱스토어 ===================');
    console.log(data);
  })
  .catch(data => {
    console.log(data);
  });

// =================== 구글 플레이 ===================

// 앱정보
/*
googlePlay
  .app({ appId: info.googlePlay.appId, lang: 'ko' })
  .then(data => {
    console.log(data);
  })
  .catch(data => {
    console.log(data);
  });
*/

// 리뷰
googlePlay
  .reviews({ appId: info.googlePlay.appId, lang: 'ko', page: 0 })
  .then(data => {
    console.log('=================== 구글 플레이 ===================');
    console.log(data);
  })
  .catch(data => {
    console.log(data);
  });
