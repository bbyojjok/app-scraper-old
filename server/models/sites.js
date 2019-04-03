const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const moment = require('moment');
moment.locale('ko');

const Sites = new Schema(
  {
    name: String,
    googlePlayAppId: String,
    googlePlayPage: { type: Number, default: 112 },
    appStoreId: Number,
    appStorePage: { type: Number, default: 10 },
    image: String,
    created: {
      type: Date,
      default: moment().format()
    },
    updated: {
      type: Date,
      default: moment().format()
    }
  },
  { collection: 'sites' }
);

module.exports = mongoose.model('sites', Sites);
