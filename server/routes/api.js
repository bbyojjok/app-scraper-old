const route = require('express').Router();
const { Detail, Review } = require('../models/index');
const moment = require('moment');
moment.locale('ko');

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

  console.log('=====================================');
  console.log('typeof score', typeof score);
  console.log('score', score);
  console.log('options', options);
  console.log('=====================================');

  const queryResult = await Review.find(options, err => {
    if (err) return res.status(401).send(`DB Error: ${err}`);
  }).sort({ date: -1 });

  //console.log(queryResult);
  res.send(queryResult);
});

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

  console.log('=====================================');
  console.log('today:', today);
  console.log('end:', end);
  console.log('prevday:', prevday);
  console.log('options', options);
  console.log('=====================================');

  const queryResult = await Review.find(options, err => {
    if (err) return res.status(401).send(`DB Error: ${err}`);
  }).sort({ date: -1 });

  //console.log(queryResult);
  res.send(queryResult);
});

module.exports = route;
