const schedule = require('node-schedule');
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();
const moment = require('moment');
moment.locale('ko');
process.env.NTBA_FIX_319 = 1;
const TelegramBot = require('node-telegram-bot-api');
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

let alertJob;

const getAlertReview = async chatId => {
  const today = moment()
    .startOf('day')
    .format('YYYYMMDD');
  const prevday = moment(today)
    .subtract(1, 'days')
    .format('YYYYMMDD');
  const resAndroid = await axios.get(`/reviews/hmall/${prevday}/${today}/android/1`);
  const resIos = await axios.get(`/reviews/hmall/${prevday}/${today}/ios/1`);

  // 실제 배포시 서버용 이미지 주소로 변경해야됨
  //const imageHmallUrl = 'http://review.hdmall.com/images/icon-telegram-hmall-android.png';
  // `http://image.thehyundai.com/icon-telegram-hmall-${os}.png`

  const reviews = resAndroid.data.concat(resIos.data);
  console.log('## reviews:', reviews);
  for (let i = 0, len = reviews.length; i < len; i++) {
    const data = reviews[i];
    const { date, os } = data;
    const { text, userName, score } = data.review;
    const { comment, title, author, rate } = data.review;
    const imageHmallUrl = `http://review.hdmall.com/images/icon-telegram-hmall-${os}.png`;
    const caption =
      os === 'android'
        ? `# ${moment(date).format('YYYY. MM. DD')}\n\n${text}`
        : `# ${moment(date).format('YYYY. MM. DD')}\n\n${comment}`;

    await bot.sendPhoto(chatId, imageHmallUrl, { caption });
  }
};

bot.onText(/\/start$/, (msg, match) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, '평점 1점 앱리뷰 알림을 시작합니다.\n(매일 오전 8시 30분)');
  alertJob = schedule.scheduleJob('30 8 * * *', () => {
    getAlertReview(chatId);
  });
  console.log('[TELEGRAM] #평점 1점 앱리뷰 알림을 시작합니다.\n(매일 오전 8시 30분)');
});

bot.onText(/\/stop$/, (msg, match) => {
  const chatId = msg.chat.id;
  alertJob.cancel();
  bot.sendMessage(chatId, '앱리뷰 알림을 종료 합니다.');
  console.log('[TELEGRAM] #앱리뷰 알림을 종료 합니다.');
});

/**
 * #### TODO ####
 * ------------------------------------------------------------
 * 2019.10.31. 작성
 *
 * ## 1번
 * 현재 로직은 매일9시 어제날짜부터 오늘날짜까지의 리뷰 1점 짜리를 가져와서
 * 텔레그램 메세지 전송
 *
 * ## 2번
 * 매일 8시 30분 마다 메시지 전송이 잘되는지 확인차 서버를 돌리고감
 *
 * ## 3번
 * 매일 8시 30분 마다 잘 뿌려지는 확인된 그 이후에
 * 리뷰 어떤식으로 뿌릴지 고민
 *
 * ## 4번
 * 1점짜리 리뷰가 수집되지 않을 경우 안내 메시지
 * ------------------------------------------------------------
 *
 */
