const cron = require('node-cron');
const moment = require('moment');

// 스크랩
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

// DB
const mongoose = require('mongoose');
const Scraper = require('./server/models/scraper');

// DB접속
const { connection } = mongoose;
connection.on('error', console.error);
connection.once('open', () => {
  console.log('Connected to mongodb server');
});
mongoose.Promise = global.Promise;
mongoose.connect(
  'mongodb://127.0.0.1:27017/appscraper',
  { useNewUrlParser: true }
);

// DB저장
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
// 구글플레이 앱정보 받아오는 모듈이 구글페이지 수정이되면서 에러발생
googlePlay
  .app({ appId: target.hmall.googlePlayAppId })
  .then(res => {
    console.log('# scraping: appInfo googlePlay');
    console.log(res);
  })
  .catch(err => {
    console.log('ERROR');
    console.log(err);
  });

googlePlay
  .reviews({
    appId: target.hmall.googlePlayAppId,
    lang: 'ko',
    sort: googlePlay.sort.NEWEST,
    page: 0
  })
  .then(res => {
    console.log('# scraping: reviews googlePlay');
    console.log(res);
  })
  .catch(err => {
    console.log('ERROR');
    console.log(err);
  });
*/

function scrapingAppInfoGooglePlay(scrapData) {
  return new Promise((resolve, reject) => {
    googlePlay
      .app({ appId: target.hmall.googlePlayAppId, lang: 'ko', country: 'kr' })
      .then(res => {
        console.log('# scraping: appInfo googlePlay');
        scrapData.app.googlePlay = res;
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
        console.log('# scraping: appInfo appStore');
        scrapData.app.appStore = res;
        resolve(scrapData);
      })
      .catch(err => {
        reject(err);
      });
  });
}

async function getReviewsGooglePlay(idx, reject) {
  let reviews = await googlePlay
    .reviews({
      appId: target.hmall.googlePlayAppId,
      lang: 'ko',
      sort: googlePlay.sort.NEWEST,
      page: idx
    })
    .then(res => {
      console.log('# scraping: reviews googlePlay', idx);
      return res;
    })
    .catch(err => {
      reject(err);
    });
  return reviews;
}

function scrapingReviewsGooglePlay(scrapData) {
  return new Promise(async (resolve, reject) => {
    let reviewsArr = [];
    for (let i = 0; i < 4; i++) {
      reviewsArr = await reviewsArr.concat(await getReviewsGooglePlay(i, reject));
    }
    scrapData.reviews.googlePlay = reviewsArr;
    resolve(scrapData);
  });
}

function getReviewsAppStore(idx, reject) {
  return appStoreReviews(target.hmall.appStoreId, 'kr', idx)
    .then(reviews => {
      console.log('# scraping: reviews appStore', idx);
      return reviews;
    })
    .catch(err => {
      reject(err);
    });
}

function scrapingReviewsAppStore(scrapData) {
  return new Promise(async (resolve, reject) => {
    let reviewsArr = [];
    for (let i = 1; i < 5; i++) {
      reviewsArr = await reviewsArr.concat(await getReviewsAppStore(i, reject));
    }
    console.log(reviewsArr.length);
    scrapData.reviews.appStore = reviewsArr;
    resolve(scrapData);
  });
}

const scraping = () => {
  console.log('# scraping: start!!');
  const scrapData = {
    name: target.hmall.name,
    app: {
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
      console.log('## scraping: success!!');
      //console.log(scrapData);

      // DB insert
      let scraper = new Scraper(scrapData);
      scraper.save(err => {
        if (err) throw err;
        console.log('DB 저장 성공');
      });
    })
    .catch(err => {
      console.log(err);
    });
};

//scraping();
scrapingReviewsAppStore();

// 스케쥴러 등록
// cron.schedule('*/2 * * * *', () => {
//   let date = moment().format('YYYY-MM-DD HH:mm:ss');
//   console.log('# schedule running', date);
//   scraping();
// });
