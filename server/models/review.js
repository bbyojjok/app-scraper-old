const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const sites = require('../../schedule/sites');

const SitesReview = sites.reduce((acc, data, idx) => {
  acc[data.name] = mongoose.model(
    `Review${data.name}`,
    new Schema(
      {
        name: String,
        review: Schema.Types.Mixed,
        os: String,
        date: { type: Date },
        created: { type: Date },
        updated: { type: Date }
      },
      { collection: `review-${data.name}` }
    )
  );
  return acc;
}, {});

module.exports = SitesReview;
