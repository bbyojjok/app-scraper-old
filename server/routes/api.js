const route = require('express').Router();
const mongoose = require('mongoose');
const makeDir = require('make-dir');
const xl = require('excel4node');
const { getApi } = require('../lib');
const Sites = require('../models/sites');
const SitesOrder = require('../models/sitesOrder.js');
const { createDetailModel, createReviewModel } = require('../models/lib');
const validationAppid = require('../../schedule/validation');
const { scraping } = require('../../schedule/scrap');
const dotenv = require('dotenv');
dotenv.config();
const moment = require('moment');
moment.locale('ko');

/**
 * GET 상세내용 조회
 * /details/사이트/운영체제
 * example: /details/hmall/android
 */
route.get('/details/:site/:os?', async (req, res) => {
  const { site, os } = req.params;
  const Detail = mongoose.model(`Detail-${site}`);
  const queryResult = await Detail.findOne({}, err => {
    if (err) return res.status(401).send(`DB Error: ${err}`);
  }).sort({ created: -1 });
  if (os) {
    return res.send(queryResult[os]);
  } else {
    return res.send(queryResult);
  }
});

/**
 * GET 리뷰 조회 (오늘부터 몇일전 기준으로 조회)
 * /review/사이트/요일/평점/운영체제
 * example: /review/hmall/7/1/android
 */
route.get('/review/:site/:date?/:score?/:os?', async (req, res) => {
  const { site, date, score, os } = req.params;
  const Review = mongoose.model(`Review-${site}`);
  // 오늘까지
  const today = moment().startOf('day').format();
  // 오늘 자정까지
  const end = moment().endOf('day').format();
  const prevday = moment(end).subtract(date, 'days').format();
  const options = {
    date: {
      $gte: prevday,
      $lte: end
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
    if (data.review.updated !== undefined) {
      data.review.updated = moment(data.date).format('YYYY. MM. DD');
    }
    if (data.review.date !== undefined) {
      data.review.date = moment(data.date).format('YYYY. MM. DD');
    }
    if (data.review.replyDate !== null && data.review.replyDate !== undefined) {
      data.review.replyDate = moment(new Date(data.review.replyDate)).format('YYYY. MM. DD');
    }
    acc.push(data);
    return acc;
  }, []);

  return res.send(result);
});

/**
 * GET 엑셀 다운 (요일별로 평점1~5점)
 * /xlsx/사이트/요일
 * example: /xlsx/hmall/7
 */
route.get('/xlsx/:site/:date?', async (req, res) => {
  const { site, date } = req.params;
  const url = `/review/${site}/${date}/12345/`;
  const today = moment().startOf('day').format('YYYYMMDD');
  const now = new Date().valueOf();
  const folder = makeDir.sync(`public/downloads/${today}/`);
  const file = `downloads/${today}/reviews_${site}_${date}_${now}.xlsx`;

  // 엑셀
  const wb = new xl.Workbook();
  const ws1 = wb.addWorksheet(`android - ${date}일 이전`);
  const ws2 = wb.addWorksheet(`ios - ${date}일 이전`);
  const style_head = wb.createStyle({
    font: { bold: true, color: '#000000', size: 13 },
    alignment: { horizontal: ['center'], vertical: ['center'] }
  });
  const style_right = wb.createStyle({ alignment: { horizontal: ['right'] } });
  const style_center = wb.createStyle({
    alignment: { horizontal: ['center'], vertical: ['center'] }
  });

  // android sheet
  ws1.cell(1, 1).string('평점').style(style_head);
  ws1.cell(1, 2).string('날짜').style(style_head);
  ws1.cell(1, 3).string('리뷰').style(style_head);
  ws1.cell(1, 4).string('작성자').style(style_head);
  ws1.column(1).setWidth(10);
  ws1.column(2).setWidth(15);
  ws1.column(3).setWidth(100);
  ws1.column(4).setWidth(30);
  ws1.row(1).setHeight(30).filter();

  // ios sheet
  ws2.cell(1, 1).string('평점').style(style_head);
  ws2.cell(1, 2).string('날짜').style(style_head);
  ws2.cell(1, 3).string('제목').style(style_head);
  ws2.cell(1, 4).string('리뷰').style(style_head);
  ws2.cell(1, 5).string('작성자').style(style_head);
  ws2.column(1).setWidth(10);
  ws2.column(2).setWidth(15);
  ws2.column(3).setWidth(60);
  ws2.column(4).setWidth(100);
  ws2.column(5).setWidth(30);
  ws2.row(1).setHeight(30).filter();

  const data = await getApi(url);
  const data_anroid = data.filter(val => val.os === 'android');
  if (data_anroid.length > 0) {
    data_anroid.forEach((data, i) => {
      const num = i + 2;
      const { score, date, text, userName } = data.review;
      ws1.cell(num, 1).string(score.toString()).style(style_right);
      ws1.cell(num, 2).string(date).style(style_right);
      ws1.cell(num, 3).string(text);
      ws1.cell(num, 4).string(userName).style(style_right);
    });
  } else {
    ws1.row(2).setHeight(80);
    ws1.cell(2, 1, 2, 4, true).string('조회된 리뷰가 없습니다.').style(style_center);
  }

  const data_ios = data.filter(val => val.os === 'ios');
  if (data_ios.length > 0) {
    data_ios.forEach((data, i) => {
      const num = i + 2;
      const { rate, updated, title, comment, author } = data.review;
      ws2.cell(num, 1).string(rate).style(style_right);
      ws2.cell(num, 2).string(updated).style(style_right);
      ws2.cell(num, 3).string(title);
      ws2.cell(num, 4).string(comment);
      ws2.cell(num, 5).string(author).style(style_right);
    });
  } else {
    ws2.row(2).setHeight(80);
    ws2.cell(2, 1, 2, 5, true).string('조회된 리뷰가 없습니다.').style(style_center);
  }

  // 엑셀 저장
  wb.write(`public/${file}`, (err, stats) => {
    if (err) {
      console.error(err);
    } else {
      return res.send({ file, stats });
    }
  });
});

/**
 * GET 리뷰 조회 (몇일부터 몇일까지 조회), 텔레그램 메시지 전송용
 * /reviews/사이트/from/to/운영체제/score
 * example: /reviews/hmall/20190301/20190313/android/1
 */
route.get('/reviews/:site/:from?/:to?/:os?/:score?', async (req, res) => {
  const { site, os, score } = req.params;
  const Review = mongoose.model(`Review-${site}`);
  const today = moment().startOf('day').format();
  const endday = moment().endOf('day').format();
  const prevday = moment(today).subtract(1, 'days').format();
  const from = req.params.from !== undefined ? moment(req.params.from, 'YYYYMMDD').format() : prevday;
  const to = req.params.to !== undefined ? (req.params.to !== 'today' ? moment(req.params.to, 'YYYYMMDD').format() : endday) : endday;
  const options = {
    date: { $gte: from, $lte: to },
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

  // console.log('today:', today);
  // console.log('end:', end);
  // console.log('prevday:', prevday);
  // console.log('options', options);

  const queryResult = await Review.find(options, err => {
    if (err) return res.status(401).send(`DB Error: ${err}`);
  }).sort({ date: -1 });

  return res.send(queryResult);
});

/**
 * POST api 조회, 상세 리뷰 같이 조회
 * req.body : { details, review_android, review_ios }
 * example: /
 */
route.post('/', async (req, res) => {
  const { details, review_android, review_ios } = req.body;
  const result = {
    details: await getApi(details),
    review_android: await getApi(review_android),
    review_ios: await getApi(review_ios)
  };
  return res.send(result);
});

/**
 * GET sitesOrder 조회
 */
route.get('/sitesOrder', async (req, res) => {
  const queryResult = await SitesOrder.findOne({}, err => {
    if (err) return res.status(401).send(`DB Error: ${err}`);
  }).sort({ created: -1 });
  return res.send(queryResult);
});

/**
 * POST sitesOrder 생성
 * req.body : { order }
 * example : "order": [0, 1, 2, 3, 4, ...]
 */
route.post('/sitesOrder', async (req, res) => {
  const { order } = req.body;

  // site 저장
  const sitesOrder = new SitesOrder({ order });
  await sitesOrder.save(async err => {
    if (err) throw err;
  });

  console.log(`[SERVER] sitesOrder created!!`);
  return res.json({ success: true, order });
});

/**
 * GET sites 조회
 */
route.get('/sites', async (req, res) => {
  const queryResult = await Sites.find({}, err => {
    if (err) return res.status(401).send(`DB Error: ${err}`);
  });
  return res.send(queryResult);
});

/**
 * POST sites 생성
 * req.body : { name, googlePlayAppId, appStoreId }
 * example : "site": {
      "name": "hmall",
      "googlePlayAppId": "com.hmallapp",
      "appStoreId": 870397981
    }
 */
route.post('/sites', async (req, res) => {
  const { name, googlePlayAppId, image } = req.body;
  const appStoreId = parseInt(req.body.appStoreId, 10);

  // name 문자열인지 공백인지
  if (typeof name !== 'string') {
    return res.status(400).json({
      error: 'not string name'
    });
  }
  if (name === '') {
    return res.status(400).json({
      error: 'empty name'
    });
  }

  // googlePlayAppId 문자열인지 공백인지
  if (typeof googlePlayAppId !== 'string') {
    return res.status(400).json({
      error: 'not string googlePlayAppId'
    });
  }
  if (googlePlayAppId === '') {
    return res.status(400).json({
      error: 'empty googlePlayAppId'
    });
  }

  // appStoreId 숫자인지
  if (typeof appStoreId !== 'number') {
    return res.status(400).json({
      error: 'not number appStoreId'
    });
  }

  // image 문자열인지 공백인지
  if (typeof image !== 'string') {
    return res.status(400).json({
      error: 'not string image'
    });
  }
  if (image === '') {
    return res.status(400).json({
      error: 'empty image'
    });
  }

  // 존재하는 name, googlePlayAppId, appStoreId 있는지
  const queryResult = await Sites.find({ $or: [{ name }, { googlePlayAppId }, { appStoreId }] }, err => {
    if (err) throw err;
  });
  if (queryResult.length > 0) {
    return res.status(400).json({
      error: 'exist name or googlePlayAppId or appStoreId'
    });
  }

  // googlePlayAppId, appStoreId 유효한지
  const validation = await validationAppid({ googlePlayAppId, appStoreId });
  if (validation.failure === 'googlePlayAppId') {
    return res.status(400).json({
      error: 'googlePlayAppId validation failed'
    });
  } else if (validation.failure === 'appStoreId') {
    return res.status(400).json({
      error: 'appStoreId validation failed'
    });
  }

  // site 저장
  const site = new Sites({ name, googlePlayAppId, appStoreId, image });
  await site.save(async err => {
    if (err) throw err;
  });

  // db 저장후에 스키마 모델 생성
  const Detail = createDetailModel(name);
  const Review = createReviewModel(name);

  // 스크랩 시작
  scraping({ name, googlePlayAppId, googlePlayPage: 112, appStoreId, appStorePage: 10, image, Detail, Review });

  console.log(`[SERVER] site ${name} created!!`);
  return res.json({ success: true, name, googlePlayAppId, appStoreId, image });
});

/**
 * PUT sites 수정
 */
route.put('/sites', async (req, res) => {
  const { name, googlePlayAppId, appStoreId } = req.body;

  console.log('GET /api/modify 사이트 수정', name);
  console.log(mongoose.Types.ObjectId.isValid(name));

  return res.send('modify');
});

/**
 * DELETE sites 삭제
 */
route.delete('/sites/:name', async (req, res) => {
  const { name } = req.params;

  console.log('GET /api/delete 사이트 삭제', name);

  res.send('DELETE sites 삭제 TEST');
});

/**
 * POST login 로그인
 */
route.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // 패스워드 문자열인지 체크
  if (typeof password !== 'string') {
    return res.status(401).json({ error: 'not string password' });
  }

  // admin 계정이 맞는지 확인
  if (username !== process.env.ADMIN_USERNAME) {
    return res.status(401).json({ error: 'worng username' });
  }

  // 패스워드 맞는지 확인
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'worng password' });
  }

  const session = req.session;
  session.logingInfo = { username };

  return res.send({ success: true });
});

/**
 * GET logout 로그아웃
 */
route.get('/logout', async (req, res) => {
  const session = req.session;
  session.destroy(err => {
    if (err) throw err;
    return res.redirect('/');
  });
});

/**
 * ## TODO
 * 1. 신규 스크랩됬거나 업데이트된 리뷰 조회
 * 2. android는 업데이트, ios는 수정을 하면 기존 리뷰는 지우고 새로 작성
 * 3. 신규 또는 업데이트 된 리뷰중에 평점이 1점 내용을 텔레그램봇으로 메시지전송 (각 사이트별로 채팅방과 봇이 필요하게됨)
 *
 */

module.exports = route;
