const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const sites = require('../../schedule/sites');

const Detail = new Schema({
  name: String,
  android: Schema.Types.Mixed,
  ios: Schema.Types.Mixed,
  created: { type: Date }
});

const SitesDetail = sites.reduce((acc, data, idx) => {
  acc[data.name] = mongoose.model(
    `Detail${data.name}`,
    new Schema(
      {
        name: String,
        android: Schema.Types.Mixed,
        ios: Schema.Types.Mixed,
        created: { type: Date }
      },
      { collection: `detail-${data.name}` }
    )
  );
  return acc;
}, {});

module.exports = SitesDetail;
