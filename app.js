// 스케쥴러 모듈
const schedule = require('node-schedule');
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
/*
class Scraper {
  constructor() {}
}
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

      /*
        1. 스크랩중에 에러가 날경우 예외처리
            일정시간(10 ~ 30분 단위로 3번 정도) 뒤에 다시 시도를 할지,
        2. 다시 시도후에도 에러가 날경우 false 입력
      */
    });
};

/*
1. promise 를 await async 형태로
2. 클래스 형태로
*/

const getKSTDate = () => {
  let date = new Date();
  date.setTime(date.getTime() + 9 * 3600000);
  return date;
};

const getRandom = (min, max, num) => {
  let randomResult = [];
  let randomList = [];
  for (let i = min; i <= max; i++) {
    randomList.push(i);
  }
  for (let i = 0; i < (num || 1); i++) {
    let randomNumber = Math.floor(Math.random() * randomList.length);
    randomResult.push(randomList[randomNumber]);
    randomList.splice(randomNumber, 1);
  }
  return randomResult.length === 1 ? randomResult[0] : randomResult;
};

const getCronRule = () => {
  /*
    Cron-style Scheduling
      '* * * * * *'
      second (0 - 59, OPTIONAL)
      minute (0 - 59)
      hour (0 - 23)
      day of month (1 - 31)
      month (1 - 12)
      day of week (0 - 7) (0 or 7 is Sun)
  */
  //테스트용
  //let ruleArr = ['*', '*/' + getRandom(2, 6), '*', '*', '*', '*'];

  //실제 적용할 크론 룰
  // 매일 1시 ~ 3시 사이 랜덤으로 분 초 적용
  let ruleArr = [getRandom(0, 59), getRandom(0, 59), getRandom(0, 3), '*', '*', '*'];

  console.log(ruleArr.join(' '));
  return ruleArr.join(' ');
};

//스케쥴러 등록
const job = schedule.scheduleJob(getCronRule(), function() {
  console.log('[schedule] run scraping', moment().format('YYYY-MM-DD HH:mm:ss'));
  scraping();
  job.cancel();
  job.reschedule(getCronRule());
});
