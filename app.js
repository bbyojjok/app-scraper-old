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
        scrapData.detail.googlePlay = false;
        scrapData.error.log = err;
        scrapData.error.where = 'detail.googlePlay';
        reject({ err, scrapData });
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
        scrapData.detail.appStore = false;
        scrapData.error.log = err;
        scrapData.error.where = 'detail.appStore';
        reject({ err, scrapData });
      });
  });
}

function getReviewsGooglePlay(idx, reject, scrapData) {
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
      scrapData.reviews.googlePlay = false;
      scrapData.error.log = err;
      scrapData.error.where = 'reviews.googlePlay';
      reject({ err, scrapData });
    });
}

function scrapingReviewsGooglePlay(scrapData) {
  return new Promise(async (resolve, reject) => {
    let reviewsArr = [];
    // 최대 가져올수 있는 페이지 page: 0 ~ 112
    for (let i = 0; i < 2; i++) {
      reviewsArr = await reviewsArr.concat(await getReviewsGooglePlay(i, reject));
    }
    scrapData.reviews.googlePlay = reviewsArr;
    resolve(scrapData);
  });
}

function getReviewsAppStore(idx, reject, scrapData) {
  return appStoreReviews({ id: target.hmall.appStoreId, country: 'kr', page: idx })
    .then(reviews => {
      console.log('[SCRAPING] reviews appStore, page:', idx);
      return reviews;
    })
    .catch(err => {
      scrapData.reviews.appStore = false;
      scrapData.error.log = err;
      scrapData.error.where = 'reviews.appStore';
      reject({ err, scrapData });
    });
}

function scrapingReviewsAppStore(scrapData) {
  return new Promise(async (resolve, reject) => {
    let reviewsArr = [];
    // 최대 가져올수 있는 페이지 page: 1 ~ 10
    for (let i = 1; i <= 2; i++) {
      reviewsArr = await reviewsArr.concat(await getReviewsAppStore(i, reject, scrapData));
    }
    scrapData.reviews.appStore = reviewsArr;
    resolve(scrapData);
  });
}

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
    #Cron-style Scheduling
      '* * * * * *'
      second (0 - 59, OPTIONAL)
      minute (0 - 59)
      hour (0 - 23)
      day of month (1 - 31)
      month (1 - 12)
      day of week (0 - 7) (0 or 7 is Sun)
  */
  //실제 적용할 크론 룰 (매일 00시 ~ 05시 사이 랜덤으로 분 초 적용)
  let rule = [getRandom(0, 59), getRandom(0, 59), getRandom(0, 4), '*', '*', '*'].join(' ');
  console.log('cron rule:', rule);
  return rule;
};

//스케쥴러 등록
const job = schedule.scheduleJob(getCronRule(), () => {
  console.log('[SCHEDULE] run scraping', moment().format('YYYY-MM-DD HH:mm:ss'));
  scraping();
  job.cancel();

  // 5시간 이후 다시 스케쥴 등록
  setTimeout(() => {
    job.reschedule(getCronRule());
  }, 1000 * 60 * 60 * 5);
});

errorCount = 0;
function scraping() {
  console.log('[SCRAPING] start');

  scrapingAppInfoGooglePlay({
    name: target.hmall.name,
    detail: {
      googlePlay: null,
      appStore: null
    },
    reviews: {
      googlePlay: null,
      appStore: null
    },
    error: {
      log: null,
      where: null
    }
  })
    .then(scrapingAppInfoAppStore)
    .then(scrapingReviewsGooglePlay)
    .then(scrapingReviewsAppStore)
    .then(scrapData => {
      console.log('[SCRAPING] success');
      errorCount = 0;
      //console.log(scrapData);

      // DB save
      let scraper = new Scraper(scrapData);
      scraper.save(err => {
        if (err) throw err;
        console.log('[SCRAPING] database saved !!', moment().format('YYYY-MM-DD HH:mm:ss'));
      });
    })
    .catch(({ err, scrapData }) => {
      console.log(err);

      errorCount++;
      console.log('errorCount:', errorCount);
      job.cancel();

      if (errorCount > 3) {
        console.log('에러 카운트가 4번 이상이면 에러내용을 데이터에 저장하고 스케쥴 재등록');
        // 에러 카운트가 4번 이상이면 에러내용을 데이터에 저장하고 스케쥴 재등록
        errorCount = 0;

        // DB save
        let scraper = new Scraper(scrapData);
        scraper.save(err => {
          if (err) throw err;
          console.log('[SCRAPING] database saved !!', moment().format('YYYY-MM-DD HH:mm:ss'));

          // 5시간 이후 다시 스케쥴 등록
          setTimeout(() => {
            job.reschedule(getCronRule());
          }, 1000 * 60 * 60 * 5);
        });
      } else {
        console.log('에러 카운트가 3회 까지 재시도');
        // 에러 카운트가 3회 까지 재시도

        let setTimeOut_time = getRandom(60, 600);
        console.log('재시작대기 시간:', setTimeOut_time);
        setTimeout(() => {
          scraping();
        }, setTimeOut_time * 1000);
      }
    });
}

/*
  #TODO
  1. 스크랩중에 에러가 날경우 예외처리
      일정시간(10 ~ 30분 단위로 3번 정도) 뒤에 다시 시도를 할지,
  2. 다시 시도후에도 에러가 날경우 false 입력
*/
/*
  #TODO
  1. promise 를 await async 형태로
  2. 클래스 형태로 리팩토링 여부

  class Person {
    constructor(name) {
      this.name = name;
    }

    sayHi() {
      console.log(`Hi! ${this.name}`);
    }
  }

  const me = new Person('seongtaek');
  me.sayHi();
*/
