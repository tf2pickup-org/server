/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

const { config } = require('dotenv');
const { MongoClient } = require('mongodb');

module.exports.up = (next) => {
  config();

  MongoClient.connect(process.env.MONGODB_URI, { useUnifiedTopology: true })
    .then((client) => client.db())
    .then((db) => db.collection('gameservers'))
    .then((collection) =>
      Promise.all([
        collection,
        collection.updateMany(
          { provider: { $exists: false } },
          { $set: { provider: 'static', isClean: true } },
        ),
      ]),
    )
    .then(([collection]) =>
      Promise.all([
        collection,
        collection.updateMany({}, { $unset: { voiceChannelName: 1 } }),
      ]),
    )
    .then(() => next());
};
