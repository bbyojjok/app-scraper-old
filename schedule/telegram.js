const schedule = require('node-schedule');
const dotenv = require('dotenv');
dotenv.config();
const moment = require('moment');
moment.locale('ko');
process.env.NTBA_FIX_319 = 1;
const TelegramBot = require('node-telegram-bot-api');

const telegramSites = [
  {
    name: 'hmall',
    bot: new TelegramBot(process.env.TELEGRAM_BOT_TOKEN_HMALL, { polling: true }),
    alertJob: null,
    newReviews: []
  },
  {
    name: 'thehyundai',
    bot: new TelegramBot(process.env.TELEGRAM_BOT_TOKEN_THEHYUNDAI, { polling: true }),
    alertJob: null,
    newReviews: []
  }
];

const clearReviews = reviews => {
  while (reviews.length > 0) {
    reviews.pop();
  }
};

const getAlertReview = async (chatId, site) => {
  // 건별 텔레그램 메시지 전송
  for (let i = 0, len = site.newReviews.length; i < len; i++) {
    const { date, os, review } = site.newReviews[i];
    const imageUrl = `http://review.hdmall.com/images/img-telegram-${site.name}-${os}.png`;
    const text = os === 'android' ? review.text : review.comment;
    const caption = `# ${moment(date).format('YYYY. MM. DD')}\n\n${text}`;
    await site.bot.sendPhoto(chatId, imageUrl, { caption });
  }
  clearReviews(site.newReviews);
};

telegramSites.forEach(site => {
  site.bot.onText(/\/start$/, (msg, match) => {
    const chatId = msg.chat.id;
    site.alertJob = schedule.scheduleJob('30 8 * * *', () => getAlertReview(chatId, site));
    site.bot.sendMessage(chatId, '평점 1점 앱리뷰 알림을 시작합니다.\n(매일 오전 8시 30분)');
    console.log('[TELEGRAM] #평점 1점 앱리뷰 알림을 시작합니다. (매일 오전 8시 30분)');
  });
  site.bot.onText(/\/stop$/, (msg, match) => {
    const chatId = msg.chat.id;
    site.alertJob.cancel();
    site.bot.sendMessage(chatId, '앱리뷰 알림을 종료 합니다.');
    console.log('[TELEGRAM] #앱리뷰 알림을 종료 합니다.');
  });
});

const setNewReviews = (name, data, result) => {
  const starRate = parseInt(data.score, 10) === 1 || parseInt(data.rate, 10) === 1;
  telegramSites.forEach(site => {
    if (name === site.name && starRate) {
      site.newReviews.push(result);
    }
  });
};

module.exports = { setNewReviews };
