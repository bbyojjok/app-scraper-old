const schedule = require('node-schedule');
const mongoose = require('mongoose');
const axios = require('axios');
const moment = require('moment');
const googlePlay = require('google-play-scraper');
const appStore = require('app-store-scraper');
const appStoreReviews = require('../appStoreLibrary/app-store-reviews');
const appStoreRatingsAverages = require('../appStoreLibrary/app-store-ratings-averages');
const { strToDate, deepCompare, undefinedToNull, objectKeyAdd, getCronRule, currentDate, objectKeyRemove, getRandom } = require('./lib');
moment.locale('ko');

// telegram api apply
// const { getNewReviews } = require('./telegram');
const { setHmallNewReviews } = require('./telegramHmall');
const { setThehyundaiNewReviews } = require('./telegramThehyundai');

const scrapingDetailGooglePlay = async scrapData => {
  try {
    const { name, googlePlayAppId } = scrapData.site;
    const result = await googlePlay.app({ appId: googlePlayAppId, lang: 'ko', country: 'kr' });
    console.log(`[SCRAPING] #${name} get detail googlePlay`);
    return result;
  } catch (err) {
    console.error(err);
    return false;
  }
};

const scrapingDetailAppStore = async scrapData => {
  try {
    const { name, appStoreId } = scrapData.site;
    const result = await appStore.app({ id: appStoreId, country: 'kr' });
    result.ratingsAverages = await appStoreRatingsAverages(appStoreId);
    console.log(`[SCRAPING] #${name} get detail appStore`);
    return result;
  } catch (err) {
    console.error(err);
    return false;
  }
};

const scrapingDetail = async scrapData => {
  try {
    const { name } = scrapData.site;
    scrapData.detail.android = await scrapingDetailGooglePlay(scrapData);
    scrapData.detail.ios = await scrapingDetailAppStore(scrapData);
    scrapData.detail.created = moment().format();

    // DB save
    const detail = new scrapData.site.Detail(scrapData.detail);
    await detail.save(err => {
      if (err) throw err;
    });
    console.log(`[SCRAPING/DB] #${name} detail data saved !!`);
    return { success: true };
  } catch (err) {
    console.error(err);
    return err;
  }
};

const getReviewGooglePlay = async ({ num, scrapData }) => {
  try {
    const { name, googlePlayAppId } = scrapData.site;
    const reviews = await googlePlay.reviews({ appId: googlePlayAppId, lang: 'ko', sort: googlePlay.sort.NEWEST, num });
    console.log(`[SCRAPING] #${name} get reviews googlePlay, num: ${num}`);
    return reviews.data;
  } catch (err) {
    console.error(err);
    scrapData.review.googlePlay.isError = true;
    return err;
  }
};

const scrapingReviewGooglePlay = async scrapData => {
  const { name, Review } = scrapData.site;
  const { updatedReviews } = scrapData.review.googlePlay;

  try {
    // 가져올수 있는 갯수 num: 1000 (default 100)
    const reviewsArr = await getReviewGooglePlay({ num: 1000, scrapData });
    const androidReview = await reviewsArr.reduce(async (acc, data, idx) => {
      const accumulator = await acc.then();
      const queryResult = await Review.findOne({ 'review.id': data.id }, err => {
        if (err) throw err;
      });

      if (queryResult) {
        // 중복된 id값이 있을경우 프로퍼티 비교후에 업데이트
        const keepProperties = ['id', 'userName', 'date', 'score', 'scoreText', 'text', 'replyDate', 'replyText'];
        const before = objectKeyAdd(queryResult.review, keepProperties);
        const after = objectKeyAdd(data, keepProperties);
        if (!deepCompare(before, undefinedToNull(after))) {
          // DB update
          const updateResult = await Review.findOneAndUpdate(
            { 'review.id': data.id },
            {
              $set: {
                review: undefinedToNull(data),
                date: data.date,
                updated: moment().format()
              }
            },
            { new: true },
            err => {
              if (err) throw err;
            }
          );
          updatedReviews.push(updateResult);

          // 텔레그램 메시지전송 리뷰 닫김
          // getNewReviews(name, data, updateResult);
          // setHmallNewReviews(name, data, updateResult);
          // setThehyundaiNewReviews(name, data, updateResult);
          console.log(`[SCRAPING/DB] #${name} reviews googlePlay, updated review idx: ${idx}`);
        }
      } else {
        const newResult = {
          name,
          review: undefinedToNull(data),
          os: 'android',
          date: data.date,
          created: moment().format()
        };
        accumulator.push(newResult);

        // 텔레그램 메시지전송 리뷰 닫김
        // getNewReviews(name, data, newResult);
        setHmallNewReviews(name, data, newResult);
        setThehyundaiNewReviews(name, data, newResult);
        console.log(`[SCRAPING] #${name} reviews googlePlay, new review idx: ${idx}`);
      }

      return Promise.resolve(accumulator);
    }, Promise.resolve([]));

    if (updatedReviews.length === 0) {
      console.log(`[SCRAPING] #${name} reviews googlePlay, not updated`);
    } else {
      console.log(`[SCRAPING/DB] #${name} reviews googlePlay, updated(${updatedReviews.length}) review data saved !!`);
    }
    if (androidReview.length > 0) {
      // DB save
      await Review.insertMany(androidReview, err => {
        if (err) throw err;
      });
      console.log(`[SCRAPING/DB] #${name} googlePlay new(${androidReview.length}) reviews data saved !!`);
    } else {
      console.log(`[SCRAPING] #${name} reviews googlePlay, no new review`);
    }
  } catch (err) {
    console.error(err);
    scrapData.review.googlePlay.isError = true;
    return { err, scrapData };
  }
};

const getReviewAppStore = async ({ page, scrapData }) => {
  try {
    const { name, appStoreId } = scrapData.site;
    const reviews = await appStore.reviews({ id: appStoreId, country: 'kr', page });
    console.log(`[SCRAPING] #${name} get reviews appStore, page: ${page}`);
    return reviews;
  } catch (err) {
    console.error(err);
    scrapData.review.appStore.isError = true;
    return err;
  }
};

const scrapingReviewAppStore = async scrapData => {
  const { name, appStorePage, Review } = scrapData.site;
  const { updatedReviews } = scrapData.review.appStore;

  try {
    // 가져올수 있는 리뷰 페이지 page: 1 ~ 10
    let reviewsArr = [];
    for (let i = 1; i <= appStorePage; i++) {
      reviewsArr = await reviewsArr.concat(await getReviewAppStore({ page: i, scrapData }));
    }
    const iosReview = await reviewsArr.reduce(async (acc, data, idx) => {
      const accumulator = await acc.then();
      const queryResult = await Review.findOne({ 'review.id': data.id }, err => {
        if (err) throw err;
      });

      if (queryResult) {
        // 중복된 id값이 있을경우 프로퍼티 비교후에 업데이트
        if (!deepCompare(queryResult.review, undefinedToNull(data))) {
          // DB update
          const updateResult = await Review.findOneAndUpdate(
            { 'review.id': data.id },
            {
              $set: {
                review: undefinedToNull(data),
                date: strToDate(data.updated),
                updated: moment().format()
              }
            },
            { new: true },
            err => {
              if (err) throw err;
            }
          );
          updatedReviews.push(updateResult);

          // 텔레그램 메시지전송 리뷰 닫김
          // getNewReviews(name, data, updateResult);
          // setHmallNewReviews(name, data, updateResult);
          // setThehyundaiNewReviews(name, data, updateResult);
          console.log(`[SCRAPING/DB] #${name} reviews appStore, updated review idx: ${idx}`);
        }
      } else {
        const newResult = {
          name,
          review: undefinedToNull(data),
          os: 'ios',
          date: strToDate(data.updated),
          created: moment().format()
        };
        accumulator.push(newResult);

        // 텔레그램 메시지전송 리뷰 닫김
        // getNewReviews(name, data, newResult);
        setHmallNewReviews(name, data, newResult);
        setThehyundaiNewReviews(name, data, newResult);
        console.log(`[SCRAPING] #${name} reviews appStore, new review idx: ${idx}`);
      }

      return Promise.resolve(accumulator);
    }, Promise.resolve([]));

    if (updatedReviews.length === 0) {
      console.log(`[SCRAPING] #${name} reviews appStore, not updated`);
    } else {
      console.log(`[SCRAPING/DB] #${name} reviews appStore, updated(${updatedReviews.length}) review data saved !!`);
    }
    if (iosReview.length > 0) {
      // DB save
      await Review.insertMany(iosReview, err => {
        if (err) throw err;
      });
      console.log(`[SCRAPING/DB] #${name} appStore new(${iosReview.length}) review data saved !!`);
    } else {
      console.log(`[SCRAPING] #${name} reviews appStore, no new review`);
    }
  } catch (err) {
    console.error(err);
    scrapData.review.appStore.isError = true;
    return { err, scrapData };
  }
};

const scraping = async site => {
  const { name } = site;
  console.log(`
======================================================================================

  [SCRAPING/START] #${name}
  ${currentDate()}

======================================================================================
  `);

  try {
    const initialState = {
      site,
      detail: { name, android: null, ios: null, created: null },
      review: {
        googlePlay: { updatedReviews: [], isError: null },
        appStore: { updatedReviews: [], isError: null }
      }
    };
    await scrapingDetail(initialState);
    await scrapingReviewGooglePlay(initialState);
    await scrapingReviewAppStore(initialState);
    console.log(`[SCRAPING/END] #${name} ${currentDate()}`);
  } catch (err) {
    console.error(err);
  }
};

const sitesScrapingStart = async () => {
  // 스크랩할 사이트 리스트 가져오기
  try {
    const res = await axios.get('/sites');
    const sites = res.data.reduce((acc, data) => {
      data.Detail = mongoose.model(`Detail-${data.name}`);
      data.Review = mongoose.model(`Review-${data.name}`);
      acc.push(data);
      return acc;
    }, []);

    // 사이트별 스크랩핑
    for (let i = 0, len = sites.length; i < len; i++) {
      await scraping(sites[i]);
    }
  } catch (err) {
    console.error(err);
  }
};

const scheduler = () => {
  // 스크랩 시작
  // sitesScrapingStart();

  // 스케쥴 등록
  const scrapJob = schedule.scheduleJob(getCronRule(), () => {
    sitesScrapingStart();
    // 스캐쥴 취소 후, 3시간 이후 다시 스케쥴 등록
    scrapJob.cancel();
    setTimeout(() => scrapJob.reschedule(getCronRule()), 1000 * 60 * 60 * 3);
  });
};

module.exports = { scheduler, scraping };
