// 스케쥴러 모듈
const cron = require('node-cron');
const moment = require('moment');

// 스크랩 모듈
const googlePlay = require('google-play-scraper');
const appStore = require('app-store-scraper');
const appStoreReviews = require('./lib/app-store-reviews');
const target = {
  hmall: {
    name: 'hmall',
    googlePlayAppId: 'com.hmallapp',
    appStoreId: 870397981
  },
  thehyundai: {
    name: 'thehyundai',
    googlePlayAppId: 'com.hdmallapp.thehyundai',
    appStoreId: 1067693191
  }
};

// DB 모듈
const mongoose = require('mongoose');
const Scraper = require('./server/models/scraper');

// DB 접속
const { connection } = mongoose;
connection.on('error', console.error);
connection.once('open', () => {
  console.log('[DB] Connected to mongodb server');
});
mongoose.Promise = global.Promise;
mongoose.connect(
  'mongodb://127.0.0.1:27017/app-scraper',
  { useNewUrlParser: true }
);

// DB 저장
/*
let scraper = new Scraper({
  name: 'hmall',
  app: {
    googlePlay: data,
    appStore: data
  },
  reviews: {
    googlePlay: data,
    appStore: data
  },
});
scraper.save(err => {
  if (err) throw err;
  console.log('DB 입력 성공');
});
*/

function scrapingAppInfoGooglePlay(scrapData) {
  return new Promise((resolve, reject) => {
    googlePlay
      .app({ appId: target.hmall.googlePlayAppId, lang: 'ko', country: 'kr' })
      .then(res => {
        console.log('[SCRAPING] appInfo googlePlay');
        scrapData.detail.googlePlay = res;
        resolve(scrapData);
      })
      .catch(err => {
        reject(err);
      });
  });
}

function scrapingAppInfoAppStore(scrapData) {
  return new Promise((resolve, reject) => {
    appStore
      .app({ id: target.hmall.appStoreId, country: 'kr' })
      .then(res => {
        console.log('[SCRAPING] appInfo appStore');
        scrapData.detail.appStore = res;
        resolve(scrapData);
      })
      .catch(err => {
        reject(err);
      });
  });
}

function getReviewsGooglePlay(idx, reject) {
  return googlePlay
    .reviews({
      appId: target.hmall.googlePlayAppId,
      lang: 'ko',
      sort: googlePlay.sort.NEWEST,
      page: idx
    })
    .then(res => {
      console.log('[SCRAPING] reviews googlePlay, page:', idx);
      return res;
    })
    .catch(err => {
      reject(err);
    });
}

function scrapingReviewsGooglePlay(scrapData) {
  return new Promise(async (resolve, reject) => {
    let reviewsArr = [];
    // page: 0 ~ 112
    for (let i = 0; i < 112; i++) {
      reviewsArr = await reviewsArr.concat(await getReviewsGooglePlay(i, reject));
    }
    scrapData.reviews.googlePlay = reviewsArr;
    resolve(scrapData);
  });
}

function getReviewsAppStore(idx, reject) {
  return appStoreReviews({ id: target.hmall.appStoreId, country: 'kr', page: idx })
    .then(reviews => {
      console.log('[SCRAPING] reviews appStore, page:', idx);
      return reviews;
    })
    .catch(err => {
      reject(err);
    });
}

function scrapingReviewsAppStore(scrapData) {
  return new Promise(async (resolve, reject) => {
    let reviewsArr = [];
    // page: 1 ~ 10
    for (let i = 1; i <= 10; i++) {
      reviewsArr = await reviewsArr.concat(await getReviewsAppStore(i, reject));
    }
    scrapData.reviews.appStore = reviewsArr;
    resolve(scrapData);
  });
}

const scraping = () => {
  console.log('[SCRAPING] start !!');
  const scrapData = {
    name: target.hmall.name,
    detail: {
      googlePlay: null,
      appStore: null
    },
    reviews: {
      googlePlay: null,
      appStore: null
    }
  };

  scrapingAppInfoGooglePlay(scrapData)
    .then(scrapingAppInfoAppStore)
    .then(scrapingReviewsGooglePlay)
    .then(scrapingReviewsAppStore)
    .then(scrapData => {
      console.log('[SCRAPING] success !!');
      //console.log(scrapData);

      console.log(
        '[SCRAPING] scrapData.reviews.googlePlay.length:',
        scrapData.reviews.googlePlay.length
      );

      console.log(
        '[SCRAPING] scrapData.reviews.appStore.length:',
        scrapData.reviews.appStore.length
      );

      // DB save
      let scraper = new Scraper(scrapData);
      scraper.save(err => {
        if (err) throw err;
        let date = moment().format('YYYY-MM-DD HH:mm:ss');
        console.log('[SCRAPING] database saved !!', date);
      });
    })
    .catch(err => {
      console.log(err);
    });
};

/*
  1. https://github.com/facundoolano/google-play-scraper/issues/289
    깃헙에 이슈 진행상황 체크해보기
  2. 스케쥴러 동작 테스트
    2-1. 스케쥴 시분을 랜덤으로 해서 등록하기
    2-2. 스크랩중에 에러가 날경우 예외처리
      일정시간(10 ~ 30분 단위로 3번 정도) 뒤에 다시 시도를 할지,
      다시 시도후에도 에러가 날경우 false 입력
    2-3. 리뷰 긁어오는 갯수를 총 몇페이지 가져올지 그리고 블럭 당하지 않게 하기 위에
      페이지 도는중 셋타임으로 텀을 줘서 해야될지
*/

//스케쥴러 등록
cron.schedule('*/20 * * * *', () => {
  let date = moment().format('YYYY-MM-DD HH:mm:ss');
  console.log('# schedule running', date);
  scraping();
});
