const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Detail = new Schema({
  name: String,
  googlePlay: Schema.Types.Mixed,
  appStore: Schema.Types.Mixed,
  created: { type: Date }
});

module.exports = mongoose.model('detail', Detail);
