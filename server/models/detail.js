const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Detail = new Schema({
  name: String,
  android: Schema.Types.Mixed,
  ios: Schema.Types.Mixed,
  created: { type: Date }
});

module.exports = mongoose.model('detail', Detail);
