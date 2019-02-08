const googlePlay = require('google-play-scraper');
const appStore = require('app-store-scraper');
const appStoreReviews = require('../lib/app-store-reviews');
const schedule = require('node-schedule');
const moment = require('moment');
moment.locale('ko');
const { Detail, Review } = require('../server/models');
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

function scrapingDetailGooglePlay(scrapData) {
  return new Promise((resolve, reject) => {
    googlePlay
      .app({ appId: target.hmall.googlePlayAppId, lang: 'ko', country: 'kr' })
      .then(res => {
        console.log('[SCRAPING] detail googlePlay');
        scrapData.detail.googlePlay = res;
        resolve(scrapData);
      })
      .catch(err => {
        scrapData.detail.googlePlay = false;
        reject({ err, scrapData });
      });
  });
}

function scrapingDetailAppStore(scrapData) {
  return new Promise((resolve, reject) => {
    appStore
      .app({ id: target.hmall.appStoreId, country: 'kr' })
      .then(res => {
        console.log('[SCRAPING] detail appStore');
        scrapData.detail.appStore = res;
        resolve(scrapData);
      })
      .catch(err => {
        scrapData.detail.appStore = false;
        reject({ err, scrapData });
      });
  });
}

function strToDate(str) {
  const result = str
    .split(' ')
    .map((data, i) => {
      return data.slice(0, -1);
    })
    .join('-');
  return moment(result, 'YYYY-MM-DD')
    .tz('Asia/Seoul')
    .format();
}

function getReviewGooglePlay(idx, reject, scrapData) {
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
      scrapData.review.googlePlay = false;
      reject({ err, scrapData });
    });
}

function scrapingReviewGooglePlay(scrapData) {
  return new Promise(async (resolve, reject) => {
    let reviewsArr = [];
    // 최대 가져올수 있는 페이지 page: 0 ~ 112
    for (let i = 0; i < 1; i++) {
      reviewsArr = await reviewsArr.concat(await getReviewGooglePlay(i, reject));
    }

    const androidReview = await reviewsArr.reduce(async (acc, data, idx) => {
      let accumulator = await acc.then();
      let queryResult = await Review.findOne({ 'review.id': data.id }, err => {
        if (err) throw err;
      });

      if (queryResult) {
        const updateResult = await Review.findOneAndUpdate(
          { 'review.id': data.id },
          {
            $set: {
              review: data,
              date: await strToDate(data.date),
              updated: await moment()
                .tz('Asia/Seoul')
                .format()
            }
          },
          { new: true },
          err => {
            if (err) throw err;
          }
        );
        await console.log('[DB] reviews googlePlay, 중복된 리뷰 업데이트', idx);
      } else {
        await accumulator.push({
          name: target.hmall.name,
          review: data,
          os: 'android',
          date: await strToDate(data.date),
          created: await moment()
            .tz('Asia/Seoul')
            .format()
        });
        console.log('[SCRAPING] reviews googlePlay, 중복되지 않는 리뷰', idx);
      }

      return Promise.resolve(accumulator);
    }, Promise.resolve([]));

    Promise.all(androidReview)
      .then(androidReview => {
        if (androidReview.length > 0) {
          console.log('[SCRAPING] 안드로이드 리뷰 신규 스크랩된 갯수:', androidReview.length);
          Review.insertMany(androidReview, (err, docs) => {
            if (err) throw err;
            console.log('[DB] scraping data saved !!', moment().format('YYYY-MM-DD HH:mm:ss'));
            resolve(scrapData);
          });
        } else {
          console.log('[SCRAPING] 안드로이드 리뷰 신규 스크랩된 부분이 없음!!');
          resolve(scrapData);
        }
      })
      .catch(err => {
        scrapData.review.googlePlay = false;
        reject({ err, scrapData });
      });
  });
}

function getReviewAppStore(idx, reject, scrapData) {
  return appStoreReviews({ id: target.hmall.appStoreId, country: 'kr', page: idx })
    .then(reviews => {
      console.log('[SCRAPING] reviews appStore, page:', idx);
      return reviews;
    })
    .catch(err => {
      scrapData.reviews.appStore = false;
      reject({ err, scrapData });
    });
}

function scrapingReviewAppStore(scrapData) {
  return new Promise(async (resolve, reject) => {
    let reviewsArr = [];
    // 최대 가져올수 있는 페이지 page: 1 ~ 10
    for (let i = 1; i <= 1; i++) {
      reviewsArr = await reviewsArr.concat(await getReviewAppStore(i, reject, scrapData));
    }

    const iosReview = await reviewsArr.reduce(async (acc, data, idx) => {
      let accumulator = await acc.then();
      let queryResult = await Review.findOne({ 'review.id': data.id }, err => {
        if (err) throw err;
      });

      if (queryResult) {
        const updateResult = await Review.findOneAndUpdate(
          { 'review.id': data.id },
          {
            $set: {
              review: data,
              date: await strToDate(data.updated),
              updated: await moment()
                .tz('Asia/Seoul')
                .format()
            }
          },
          { new: true },
          err => {
            if (err) throw err;
          }
        );
        await console.log('[DB] reviews appStore, 중복된 리뷰 업데이트', idx);
      } else {
        await accumulator.push({
          name: target.hmall.name,
          review: data,
          os: 'ios',
          date: await strToDate(data.updated),
          created: await moment()
            .tz('Asia/Seoul')
            .format()
        });
        console.log('[SCRAPING] reviews appStore, 중복되지 않는 리뷰', idx);
      }

      return Promise.resolve(accumulator);
    }, Promise.resolve([]));

    Promise.all(iosReview)
      .then(iosReview => {
        if (iosReview.length > 0) {
          console.log('[SCRAPING] ios 리뷰 신규 스크랩된 갯수:', iosReview.length);
          Review.insertMany(iosReview, (err, docs) => {
            if (err) throw err;
            console.log('[DB] scraping data saved !!', moment().format('YYYY-MM-DD HH:mm:ss'));
            resolve(scrapData);
          });
        } else {
          console.log('[SCRAPING] ios 리뷰 신규 스크랩된 부분이 없음!!');
          resolve(scrapData);
        }
      })
      .catch(err => {
        scrapData.reviews.appStore = false;
        reject({ err, scrapData });
      });
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
  console.log('[CRON] rule:', rule);
  return rule;
};

//스케쥴러 등록
let job;
let errorCount = 0;

function scraping() {
  console.log('[SCRAPING] start');
  scrapingDetailGooglePlay({
    detail: {
      name: target.hmall.name,
      googlePlay: null,
      appStore: null,
      created: null
    },
    review: {
      googlePlay: null,
      appStore: null
    }
  })
    .then(scrapingDetailAppStore)
    .then(scrapingReviewGooglePlay)
    .then(scrapingReviewAppStore)
    .then(scrapData => {
      console.log('[SCRAPING] success');
      errorCount = 0;

      // DB save
      scrapData.detail.created = moment()
        .tz('Asia/Seoul')
        .format();
      let detail = new Detail(scrapData.detail);
      detail.save(err => {
        if (err) throw err;
        console.log('[DB] scraping data saved !!', moment().format('YYYY-MM-DD HH:mm:ss'));
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
        scrapData.detail.created = moment()
          .tz('Asia/Seoul')
          .format();
        let detail = new Detail(scrapData.detail);
        detail.save(err => {
          if (err) throw err;
          console.log('[DB] scraping data saved !!', moment().format('YYYY-MM-DD HH:mm:ss'));
          // 5시간 이후 다시 스케쥴 등록
          setTimeout(() => {
            job.reschedule(getCronRule());
          }, 1000 * 60 * 60 * 5);
        });
      } else {
        console.log('에러 카운트가 3회 까지 재시도');
        // 에러 카운트가 3회 까지 재시도

        // 1~10분(초단위) 사이 재시작
        setTimeout(() => {
          scraping();
        }, getRandom(60, 600) * 1000);
      }
    });
}

function scheduler() {
  // 테스트
  scraping();

  // 스케쥴 등록
  // job = schedule.scheduleJob(getCronRule(), () => {
  //   console.log('[SCHEDULE] run scraping', moment().format('YYYY-MM-DD HH:mm:ss'));
  //   scraping();
  //   job.cancel();
  //   // 5시간 이후 다시 스케쥴 등록
  //   setTimeout(() => {
  //     job.reschedule(getCronRule());
  //   }, 1000 * 60 * 60 * 5);
  // });
}

module.exports = scheduler;
