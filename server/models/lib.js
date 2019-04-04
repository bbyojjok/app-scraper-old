const mongoose = require('mongoose');
const Schema = mongoose.Schema;

function createDetailModel(name) {
  return mongoose.model(
    `Detail-${name}`,
    new Schema(
      {
        name: String,
        android: Schema.Types.Mixed,
        ios: Schema.Types.Mixed,
        created: { type: Date }
      },
      { collection: `detail-${name}` }
    )
  );
}

function createReviewModel(name) {
  return mongoose.model(
    `Review-${name}`,
    new Schema(
      {
        name: String,
        review: Schema.Types.Mixed,
        os: String,
        date: { type: Date },
        created: { type: Date },
        updated: { type: Date }
      },
      { collection: `review-${name}` }
    )
  );
}

module.exports = { createDetailModel, createReviewModel };
