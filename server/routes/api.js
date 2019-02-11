const route = require('express').Router();
const { Review } = require('../models/index');
const moment = require('moment');
moment.locale('ko');

route.get('/', (req, res) => {
  res.send('hello world');
});

route.get('/reviews/:from?/:to?/:os?', async (req, res) => {
  const today = moment()
    .startOf('day')
    .format();
  const end = moment()
    .endOf('day')
    .format();
  const prevday = moment(today)
    .subtract(1, 'days')
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
  console.log('from:', from);
  console.log('to:', to);
  console.log('today:', today);
  console.log('end:', end);
  console.log('prevday:', prevday);
  console.log('os:', os);
  console.log('=====================================');

  const queryResult = await Review.find(options, err => {
    if (err) return res.status(401).send(`DB Error: ${err}`);
  });
  //console.log(queryResult);
  res.send(queryResult);
});

module.exports = route;
