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
        collection.updateMany({}, { $set: { isOnline: false } }),
      ]),
    )
    .then(([collection]) =>
      collection.updateMany({}, { $unset: { deleted: 1 } }),
    )
    .then(() => next());
};
