const route = require('express').Router();
const { Detail, Review } = require('../models/index');
const moment = require('moment');
moment.locale('ko');

/**
 * 상세내용 조회
 * /details/운영체제
 */
route.get('/details/:os?', async (req, res) => {
  const os = req.params.os;
  const queryResult = await Detail.findOne({}, err => {
    if (err) return res.status(401).send(`DB Error: ${err}`);
  }).sort({ created: -1 });
  if (os) {
    res.send(queryResult[os]);
  } else {
    res.send(queryResult);
  }
});

/**
 * 리뷰 조회 (오늘부터 몇일전 기준으로 조회)
 * /review/요일/평점/운영체제
 */
route.get('/review/:date?/:score?/:os?', async (req, res) => {
  const date = req.params.date;
  const score = req.params.score;
  const os = req.params.os;
  const today = moment()
    .startOf('day')
    .format();
  const prevday = moment(today)
    .subtract(date, 'days')
    .format();
  const options = {
    date: {
      $gte: prevday,
      $lte: today
    },
    $or: [
      {
        'review.score': {
          $in: score.split('').reduce((acc, data) => {
            acc.push(parseInt(data, 10));
            return acc;
          }, [])
        }
      },
      {
        'review.rate': {
          $in: score.split('')
        }
      }
    ]
  };
  if (os) {
    options.os = os;
  }

  const queryResult = await Review.find(options, err => {
    if (err) return res.status(401).send(`DB Error: ${err}`);
  }).sort({ date: -1 });

  const result = await queryResult.reduce((acc, data) => {
    let dateFormatChange = data;
    if (dateFormatChange.review.updated !== undefined) {
      dateFormatChange.review.updated = moment(dateFormatChange.date)
        .tz('Asia/Seoul')
        .format('YYYY. MM. DD');
    }
    if (dateFormatChange.review.date !== undefined) {
      dateFormatChange.review.date = moment(dateFormatChange.date)
        .tz('Asia/Seoul')
        .format('YYYY. MM. DD');
    }
    acc.push(dateFormatChange);
    return acc;
  }, []);

  res.send(result);
});

/**
 * 리뷰 조회 (몇일부터 몇일까지 조회)
 * /reviews/from/to/운영체제
 */
route.get('/reviews/:from?/:to?/:os?', async (req, res) => {
  const today = moment()
    .startOf('day')
    .format();
  const prevday = moment(today)
    .subtract(1, 'days')
    .format();
  const end = moment()
    .endOf('day')
    .format();
  const from =
    req.params.from !== undefined
      ? moment(req.params.from, 'YYYYMMDD')
          .tz('Asia/Seoul')
          .format()
      : prevday;
  const to =
    req.params.to !== undefined
      ? req.params.to !== 'today'
        ? moment(req.params.to, 'YYYYMMDD')
            .tz('Asia/Seoul')
            .format()
        : today
      : today;
  const os = req.params.os;
  const options = {
    date: {
      $gte: from,
      $lte: to
    }
  };
  if (os) {
    options.os = os;
  }

  console.log('today:', today);
  console.log('end:', end);
  console.log('prevday:', prevday);
  console.log('options', options);

  const queryResult = await Review.find(options, err => {
    if (err) return res.status(401).send(`DB Error: ${err}`);
  }).sort({ date: -1 });

  res.send(queryResult);
});

/**
 * 리뷰 조회 (그날 스크랩된 리뷰 조회용)
 * TODO 2차 신규 또는 업데이트 된 스크랩 내용을 텔레그램으로 쏴주기
 * 구현방법은 추후 논의
 */

module.exports = route;
