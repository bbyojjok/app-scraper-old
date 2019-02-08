const router = require('express').Router();
const scraper = require('./scraper');
const { Review } = require('../models/index');
const moment = require('moment');
moment.locale('ko');

router.use('/scraper', scraper);

const today = moment()
  .startOf('day')
  .format();
const end = moment()
  .endOf('day')
  .format();
const prevday = moment(today)
  .subtract(1, 'days')
  .format();

router.get('/api/find', async (req, res) => {
  console.log(today);
  console.log(prevday);

  const queryResult = await Review.find(
    {
      date: {
        $gte: prevday,
        $lte: today
      }
    },
    err => {
      if (err) return res.status(401).send(`DB Error: ${err}`);
    }
  );
  console.log(queryResult);
  res.send(queryResult);
});

module.exports = router;
