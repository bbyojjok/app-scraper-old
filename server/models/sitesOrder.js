const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const moment = require('moment');
moment.locale('ko');

const SitesOrder = new Schema(
  {
    order: Schema.Types.Mixed,
    created: {
      type: Date,
      default: moment().format()
    },
    updated: {
      type: Date,
      default: moment().format()
    }
  },
  { collection: 'sites-order' }
);

module.exports = mongoose.model('sites-order', SitesOrder);
