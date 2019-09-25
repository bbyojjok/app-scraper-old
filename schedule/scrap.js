const schedule = require('node-schedule');
const axios = require('axios');
const mongoose = require('mongoose');
const googlePlay = require('google-play-scraper');
const appStore = require('app-store-scraper');
const appStoreReviews = require('../appStoreLibrary/app-store-reviews');
const appStoreRatingsAverages = require('../appStoreLibrary/app-store-ratings-averages');
const {
  getRandom,
  strToDate,
  deepCompare,
  undefinedToNull,
  objectKeyRemove,
  objectKeyAdd,
  getCronRule
} = require('./lib');
const moment = require('moment');
moment.locale('ko');
let scrapJob;

const scrapingDetailGooglePlay = async scrapData => {
  try {
    const result = await googlePlay.app({
      appId: scrapData.site.googlePlayAppId,
      lang: 'ko',
      country: 'kr'
    });
    console.log(`[SCRAPING] #${scrapData.site.name} detail googlePlay`);
    return result;
  } catch (err) {
    console.error(err);
    return false;
  }
};

const scrapingDetailAppStore = async scrapData => {
  try {
    const result = await appStore.app({ id: scrapData.site.appStoreId, country: 'kr' });
    result.ratingsAverages = await appStoreRatingsAverages(scrapData.site.appStoreId);
    console.log(`[SCRAPING] #${scrapData.site.name} detail appStore`);
    return result;
  } catch (err) {
    console.error(err);
    return false;
  }
};

const scrapingDetail = async scrapData => {
  try {
    scrapData.detail.android = await scrapingDetailGooglePlay(scrapData);
    scrapData.detail.ios = await scrapingDetailAppStore(scrapData);
    scrapData.detail.created = moment().format();

    // DB save
    const detail = new scrapData.site.Detail(scrapData.detail);
    await detail.save(err => {
      if (err) throw err;
    });
    console.log(`[SCRAPING/DB] #${scrapData.site.name} scraping detail data saved`);
  } catch (err) {
    console.error(err);
  }
};

const getReviewGooglePlay = async ({ num, scrapData, reject }) => {
  try {
    const reviews = await googlePlay.reviews({
      appId: scrapData.site.googlePlayAppId,
      lang: 'ko',
      sort: googlePlay.sort.NEWEST,
      num
    });
    console.log(`[SCRAPING] #${scrapData.site.name} reviews googlePlay, num: ${num}`);
    return reviews;
  } catch (err) {
    scrapData.review.googlePlay.error = false;
    //return { err, scrapData };
    reject({ err, scrapData });
  }
};

const scrapingReviewGooglePlay = scrapData => {
  return new Promise(async (resolve, reject) => {
    // 가져올수 있는 갯수 num: 1000 (default 100)
    const reviewsArr = await getReviewGooglePlay({ num: 1000, scrapData, reject });
    const androidReview = await reviewsArr.reduce(async (acc, data, idx) => {
      const accumulator = await acc.then();
      const queryResult = await scrapData.site.Review.findOne({ 'review.id': data.id }, err => {
        if (err) throw err;
      });

      if (queryResult) {
        const before = await objectKeyAdd(queryResult.review, [
          'id',
          'userName',
          'date',
          'score',
          'scoreText',
          'text',
          'replyDate',
          'replyText'
        ]);
        const after = await objectKeyAdd(data, [
          'id',
          'userName',
          'date',
          'score',
          'scoreText',
          'text',
          'replyDate',
          'replyText'
        ]);

        if (!(await deepCompare(before, await undefinedToNull(after)))) {
          const updateResult = await scrapData.site.Review.findOneAndUpdate(
            { 'review.id': data.id },
            {
              $set: {
                review: await undefinedToNull(data),
                //date: await strToDate(data.date),
                date: data.date,
                updated: await moment().format()
              }
            },
            { new: true },
            err => {
              if (err) throw err;
            }
          );
          await scrapData.review.googlePlay.update.push(updateResult);
          await console.log(
            `[SCRAPING/DB] #${scrapData.site.name} reviews googlePlay, 중복되어 업데이트된 리뷰 ${idx}`
          );
        }
      } else {
        if (data.date !== 'Invalid Date') {
          await accumulator.push({
            name: scrapData.site.name,
            review: await undefinedToNull(data),
            os: 'android',
            //date: await strToDate(data.date),
            date: data.date,
            created: await moment().format()
          });
          await console.log(
            `[SCRAPING] #${scrapData.site.name} reviews googlePlay, 중복되지 않는 신규 리뷰 ${idx}`
          );
        } else {
          console.log(
            `[SCRAPING] #${scrapData.site.name} reviews googlePlay, 수집할 리뷰 date 속성에 잘못된 날짜형식(Invalid Date)이 포함되어 리뷰수집에서 제외됨.`
          );
        }
      }

      return Promise.resolve(accumulator);
    }, Promise.resolve([]));

    Promise.all(androidReview)
      .then(androidReview => {
        if (scrapData.review.googlePlay.update !== null) {
          console.log(
            `[SCRAPING] #${scrapData.site.name} 안드로이드 리뷰 업데이트된 갯수: ${scrapData.review.googlePlay.update.length}`
          );
        } else {
          console.log(
            `[SCRAPING] #${scrapData.site.name} 안드로이드 리뷰 업데이트된 부분이 없음!!`
          );
        }

        if (androidReview.length > 0) {
          console.log(
            `[SCRAPING] #${scrapData.site.name} 안드로이드 리뷰 신규 스크랩된 갯수: ${androidReview.length}`
          );
          scrapData.site.Review.insertMany(androidReview, (err, docs) => {
            if (err) throw err;
            console.log(
              `[SCRAPING/DB] #${
                scrapData.site.name
              } scraping android review data saved ${moment().format('YYYY-MM-DD HH:mm:ss')}`
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
};

const getReviewAppStore = async ({ page, scrapData, reject }) => {
  try {
    const reviews = await appStoreReviews({
      id: scrapData.site.appStoreId,
      country: 'kr',
      page
    });
    console.log(`[SCRAPING] #${scrapData.site.name} reviews appStore, page: ${page}`);
    return reviews;
  } catch (err) {
    scrapData.review.appStore.error = false;
    //return { err, scrapData };
    reject({ err, scrapData });
  }
};

function scrapingReviewAppStore(scrapData) {
  return new Promise(async (resolve, reject) => {
    // 가져올수 있는 리뷰 페이지 page: 1 ~ 10
    let reviewsArr = [];
    for (let i = 1; i <= scrapData.site.appStorePage; i++) {
      reviewsArr = await reviewsArr.concat(await getReviewAppStore({ page: i, scrapData, reject }));
    }
    const iosReview = await reviewsArr.reduce(async (acc, data, idx) => {
      const accumulator = await acc.then();
      const queryResult = await scrapData.site.Review.findOne({ 'review.id': data.id }, err => {
        if (err) throw err;
      });

      if (queryResult) {
        if (!(await deepCompare(queryResult.review, await undefinedToNull(data)))) {
          const updateResult = await scrapData.site.Review.findOneAndUpdate(
            { 'review.id': data.id },
            {
              $set: {
                review: await undefinedToNull(data),
                date: await strToDate(data.updated),
                updated: await moment().format()
              }
            },
            { new: true },
            err => {
              if (err) throw err;
            }
          );
          await scrapData.review.appStore.update.push(updateResult);
          await console.log(
            `[SCRAPING/DB] #${scrapData.site.name} reviews appStore, 중복되어 업데이트된 리뷰 ${idx}`
          );
        }
      } else {
        await accumulator.push({
          name: scrapData.site.name,
          review: await undefinedToNull(data),
          os: 'ios',
          date: await strToDate(data.updated),
          created: await moment().format()
        });
        await console.log(
          `[SCRAPING] #${scrapData.site.name} reviews appStore, 중복되지 않는 신규 리뷰 ${idx}`
        );
      }

      return Promise.resolve(accumulator);
    }, Promise.resolve([]));

    Promise.all(iosReview)
      .then(iosReview => {
        if (scrapData.review.appStore.update !== null) {
          console.log(
            `[SCRAPING] #${scrapData.site.name} ios 리뷰 업데이트된 갯수: ${scrapData.review.appStore.update.length}`
          );
        } else {
          console.log(`[SCRAPING] #${scrapData.site.name} ios 리뷰 업데이트된 부분이 없음!!`);
        }

        if (iosReview.length > 0) {
          console.log(
            `[SCRAPING] #${scrapData.site.name} ios 리뷰 신규 스크랩된 갯수: ${iosReview.length}`
          );
          scrapData.site.Review.insertMany(iosReview, (err, docs) => {
            if (err) throw err;
            console.log(
              `[SCRAPING/DB] #${
                scrapData.site.name
              } scraping ios review data saved ${moment().format('YYYY-MM-DD HH:mm:ss')}`
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

const scraping = async site => {
  console.log(`
================================================================

  [SCRAPING] #${site.name} start 
  ${moment().format('YYYY-MM-DD HH:mm:ss')}

================================================================
  `);

  const initialState = {
    site,
    detail: { name: site.name, android: null, ios: null, created: null },
    review: { googlePlay: { update: [], error: null }, appStore: { update: [], error: null } }
  };

  try {
    // get detail and saved
    await scrapingDetail(initialState);

    // get reviews and saved
    await scrapingReviewGooglePlay(initialState)
      .then(scrapingReviewAppStore)
      .then(scrapData => {
        console.log(scrapData);
        console.log(
          `[SCRAPING] #${scrapData.site.name} success ${moment().format('YYYY-MM-DD HH:mm:ss')}`
        );
      })
      .catch(({ err, scrapData }) => {
        console.log(`
          ${err}
          ${scrapData}
        `);
      });
  } catch (err) {
    console.error(err);
  }
};

const sitesScraping = async sites => {
  // 사이트별 스크랩핑
  for (let i = 0, len = sites.length; i < len; i++) {
    await scraping(sites[i]);
  }
};

const sitesScrapingStart = async () => {
  try {
    const res = await axios.get('/sites');
    const sites = res.data.reduce((acc, data) => {
      data.Detail = mongoose.model(`Detail-${data.name}`);
      data.Review = mongoose.model(`Review-${data.name}`);
      acc.push(data);
      return acc;
    }, []);
    sitesScraping(sites);
  } catch (err) {
    console.error(err);
  }
};

const setState = state => {
  console.log(state);
  state.c = 'c';
  console.log(state);
};

const scheduler = site => {
  if (site) {
    scraping(site);
  } else {
    sitesScrapingStart();

    // 스케쥴 등록
    scrapJob = schedule.scheduleJob(getCronRule(), () => {
      sitesScrapingStart();

      // 7시간 이후 다시 스케쥴 등록
      scrapJob.cancel();
      setTimeout(() => {
        scrapJob.reschedule(getCronRule());
      }, 1000 * 60 * 60 * 7);
    });
  }
};

module.exports = scheduler;
