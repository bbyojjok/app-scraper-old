const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Review = new Schema({
  name: String,
  review: Schema.Types.Mixed,
  os: String,
  date: { type: Date },
  created: { type: Date },
  updated: { type: Date }
});

module.exports = mongoose.model('review', Review);
