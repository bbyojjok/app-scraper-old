const googlePlay = require('google-play-scraper');
const appStore = require('app-store-scraper');
const appStoreReviews = require('../lib/app-store-reviews');
const appStoreRatingsAverages = require('../lib/app-store-ratings-averages');
const schedule = require('node-schedule');
const sites = require('./sites');
const { Detail, Review } = require('../server/models');
const {
  getRandom,
  strToDate,
  deepCompare,
  undefinedToNull,
  objectKeyRemove,
  getCronRule
} = require('./lib');
const moment = require('moment');
moment.locale('ko');

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
let scrapJob;

function scrapingDetailGooglePlay(scrapData) {
  return new Promise((resolve, reject) => {
    googlePlay
      .app({ appId: scrapData.site.googlePlayAppId, lang: 'ko', country: 'kr' })
      .then(res => {
        console.log(`[SCRAPING] #${scrapData.site.name} detail googlePlay`);
        scrapData.detail.android = res;
        resolve(scrapData);
      })
      .catch(err => {
        scrapData.detail.android = false;
        reject({ err, scrapData });
      });
  });
}

function scrapingDetailAppStore(scrapData) {
  return new Promise((resolve, reject) => {
    appStore
      .app({ id: scrapData.site.appStoreId, country: 'kr' })
      .then(async res => {
        console.log(`[SCRAPING] #${scrapData.site.name} detail appStore`);
        scrapData.detail.ios = res;
        await appStoreRatingsAverages(scrapData.site.appStoreId)
          .then(res => {
            scrapData.detail.ios.ratingsAverages = res;
            resolve(scrapData);
          })
          .catch(err => {
            reject({ err, scrapData });
          });
      })
      .catch(err => {
        scrapData.detail.ios = false;
        reject({ err, scrapData });
      });
  });
}

async function getReviewGooglePlay(idx, reject, scrapData) {
  return await googlePlay
    .reviews({
      appId: scrapData.site.googlePlayAppId,
      lang: 'ko',
      sort: googlePlay.sort.NEWEST,
      page: idx
    })
    .then(res => {
      console.log(`[SCRAPING] #${scrapData.site.name} reviews googlePlay, page: ${idx}`);
      return res;
    })
    .catch(err => {
      scrapData.review.googlePlay.error = false;
      reject({ err, scrapData });
    });
}

function scrapingReviewGooglePlay(scrapData) {
  return new Promise(async (resolve, reject) => {
    let reviewsArr = [];
    // 최대 가져올수 있는 페이지 page: 0 ~ 112
    for (let i = 0; i < scrapData.site.googlePlayPage; i++) {
      reviewsArr = await reviewsArr.concat(await getReviewGooglePlay(i, reject, scrapData));
    }

    const androidReview = await reviewsArr.reduce(async (acc, data, idx) => {
      let accumulator = await acc.then();
      let queryResult = await Review[scrapData.site.name].findOne({ 'review.id': data.id }, err => {
        if (err) throw err;
      });

      if (queryResult) {
        let before = await objectKeyRemove(queryResult.review, 'userImage');
        let after = await objectKeyRemove(data, 'userImage');
        if (!(await deepCompare(before, await undefinedToNull(after)))) {
          const updateResult = await Review[scrapData.site.name].findOneAndUpdate(
            { 'review.id': data.id },
            {
              $set: {
                review: await undefinedToNull(data),
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
          await scrapData.review.googlePlay.update.push(updateResult);
          await console.log(
            `[DB] #${scrapData.site.name} reviews googlePlay, 중복된 리뷰 업데이트 ${idx}`
          );
        }
      } else {
        await accumulator.push({
          name: target.hmall.name,
          review: await undefinedToNull(data),
          os: 'android',
          date: await strToDate(data.date),
          created: await moment()
            .tz('Asia/Seoul')
            .format()
        });
        await console.log(
          `[SCRAPING] #${scrapData.site.name} reviews googlePlay, 중복되지 않는 리뷰 ${idx}`
        );
      }

      return Promise.resolve(accumulator);
    }, Promise.resolve([]));

    Promise.all(androidReview)
      .then(androidReview => {
        if (scrapData.review.googlePlay.update !== null) {
          console.log(
            `[SCRAPING] #${scrapData.site.name} 안드로이드 리뷰 업데이트된 갯수: ${
              scrapData.review.googlePlay.update.length
            }`
          );
        } else {
          console.log(
            `[SCRAPING] #${scrapData.site.name} 안드로이드 리뷰 업데이트된 부분이 없음!!`
          );
        }

        if (androidReview.length > 0) {
          console.log(
            `[SCRAPING] #${scrapData.site.name} 안드로이드 리뷰 신규 스크랩된 갯수: ${
              androidReview.length
            }`
          );
          Review[scrapData.site.name].insertMany(androidReview, (err, docs) => {
            if (err) throw err;
            console.log(
              `[DB] #${scrapData.site.name} scraping review data saved ${moment().format(
                'YYYY-MM-DD HH:mm:ss'
              )}`
            );
            resolve(scrapData);
          });
        } else {
          console.log(
            `[SCRAPING] #${scrapData.site.name} 안드로이드 리뷰 신규 스크랩된 부분이 없음!!`
          );
          resolve(scrapData);
        }
      })
      .catch(err => {
        scrapData.review.googlePlay.error = false;
        reject({ err, scrapData });
      });
  });
}

async function getReviewAppStore(idx, reject, scrapData) {
  return await appStoreReviews({ id: scrapData.site.appStoreId, country: 'kr', page: idx })
    .then(reviews => {
      console.log(`[SCRAPING] #${scrapData.site.name} reviews appStore, page: ${idx}`);
      return reviews;
    })
    .catch(err => {
      scrapData.review.appStore.error = false;
      reject({ err, scrapData });
    });
}

function scrapingReviewAppStore(scrapData) {
  return new Promise(async (resolve, reject) => {
    let reviewsArr = [];
    // 최대 가져올수 있는 페이지 page: 1 ~ 10
    for (let i = 1; i <= scrapData.site.appStorePage; i++) {
      reviewsArr = await reviewsArr.concat(await getReviewAppStore(i, reject, scrapData));
    }
    const iosReview = await reviewsArr.reduce(async (acc, data, idx) => {
      let accumulator = await acc.then();
      let queryResult = await Review[scrapData.site.name].findOne({ 'review.id': data.id }, err => {
        if (err) throw err;
      });

      if (queryResult) {
        if (!(await deepCompare(queryResult.review, await undefinedToNull(data)))) {
          const updateResult = await Review[scrapData.site.name].findOneAndUpdate(
            { 'review.id': data.id },
            {
              $set: {
                review: await undefinedToNull(data),
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
          await scrapData.review.appStore.update.push(updateResult);
          await console.log(
            `[DB] #${scrapData.site.name} reviews appStore, 중복된 리뷰 업데이트 ${idx}`
          );
        }
      } else {
        await accumulator.push({
          name: target.hmall.name,
          review: await undefinedToNull(data),
          os: 'ios',
          date: await strToDate(data.updated),
          created: await moment()
            .tz('Asia/Seoul')
            .format()
        });
        await console.log(
          `[SCRAPING] #${scrapData.site.name} reviews appStore, 중복되지 않는 리뷰 ${idx}`
        );
      }

      return Promise.resolve(accumulator);
    }, Promise.resolve([]));

    Promise.all(iosReview)
      .then(iosReview => {
        if (scrapData.review.appStore.update !== null) {
          console.log(
            `[SCRAPING] #${scrapData.site.name} ios 리뷰 업데이트된 갯수: ${
              scrapData.review.appStore.update.length
            }`
          );
        } else {
          console.log(`[SCRAPING] #${scrapData.site.name} ios 리뷰 업데이트된 부분이 없음!!`);
        }

        if (iosReview.length > 0) {
          console.log(
            `[SCRAPING] #${scrapData.site.name} ios 리뷰 신규 스크랩된 갯수: ${iosReview.length}`
          );
          Review[scrapData.site.name].insertMany(iosReview, (err, docs) => {
            if (err) throw err;
            console.log(
              `[DB] #${scrapData.site.name} scraping review data saved ${moment().format(
                'YYYY-MM-DD HH:mm:ss'
              )}`
            );
            resolve(scrapData);
          });
        } else {
          console.log(`[SCRAPING] #${scrapData.site.name} ios 리뷰 신규 스크랩된 부분이 없음!!`);
          resolve(scrapData);
        }
      })
      .catch(err => {
        scrapData.review.appStore.error = false;
        reject({ err, scrapData });
      });
  });
}

async function scraping(site) {
  const siteBak = site;
  const scrap = {
    site,
    detail: {
      name: site.name,
      android: null,
      ios: null,
      created: null
    },
    review: {
      googlePlay: {
        update: [],
        error: null
      },
      appStore: {
        update: [],
        error: null
      }
    }
  };
  let scrapError = 0;
  console.log(`
================================================================

  [SCRAPING] #${site.name} start 
  ${moment().format('YYYY-MM-DD HH:mm:ss')}

================================================================
  `);
  await scrapingDetailGooglePlay(scrap)
    .then(scrapingDetailAppStore)
    .then(scrapingReviewGooglePlay)
    .then(scrapingReviewAppStore)
    .then(async scrapData => {
      scrapError = 0;

      // DB save
      scrapData.detail.created = moment()
        .tz('Asia/Seoul')
        .format();
      let detail = new Detail[scrapData.site.name](scrapData.detail);
      try {
        let detailResult = await detail.save(err => {
          if (err) throw err;
        });
        await console.log(`[DB] #${scrapData.site.name} scraping detail data saved`);
        await console.log(
          `[SCRAPING] #${scrapData.site.name} success ${moment().format('YYYY-MM-DD HH:mm:ss')}`
        );
        return detailResult;
      } catch (err) {
        console.error(err);
      }
    })
    .catch(async ({ err, scrapData }) => {
      scrapJob.cancel();
      console.log(err);
      scrapError++;
      console.log('scrapError:', scrapError);

      if (scrapError > 3) {
        console.log(
          `#${
            scrapData.site.name
          } 에러 카운트가 4번 이상이면 에러내용을 데이터에 저장하고 스케쥴 재등록`
        );
        // 에러 카운트가 4번 이상이면 에러내용을 데이터에 저장하고 스케쥴 재등록
        scrapError = 0;

        // DB save
        scrapData.detail.created = moment()
          .tz('Asia/Seoul')
          .format();
        let detail = new Detail[scrapData.site.name](scrapData.detail);
        try {
          let detailResult = await detail.save(err => {
            if (err) throw err;
          });
          await console.log(`[DB] #${scrapData.site.name} scraping detail data saved`);
          await console.log(
            `[SCRAPING] #${scrapData.site.name} 에러 4번 발견됨 확인바람 ${moment().format(
              'YYYY-MM-DD HH:mm:ss'
            )}`
          );

          // 6시간 이후 다시 스케쥴 등록
          await setTimeout(() => {
            scrapJob.reschedule(getCronRule());
          }, 1000 * 60 * 60 * 6);
          return detailResult;
        } catch (err) {
          console.error(err);
        }
      } else {
        console.log(`#${scrapData.site.name} 에러 카운트가 3회 까지 재시도`);
        // 에러 카운트가 3회 까지 재시도
        // 1~10분(초단위) 사이 재시작
        setTimeout(() => {
          scraping(siteBak);
        }, getRandom(60, 600) * 1000);
      }
    });
}

async function sitesScraping(sites) {
  // 사이트별 스크랩핑
  for (let i = 0, len = sites.length; i < len; i++) {
    await scraping(sites[i]);
  }
}

function scheduler() {
  // 테스트
  // sitesScraping(sites);

  // 스케쥴 등록
  scrapJob = schedule.scheduleJob(getCronRule(), () => {
    sitesScraping(sites);

    scrapJob.cancel();
    // 6시간 이후 다시 스케쥴 등록
    setTimeout(() => {
      scrapJob.reschedule(getCronRule());
    }, 1000 * 60 * 60 * 6);
  });
}

module.exports = scheduler;
