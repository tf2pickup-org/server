/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

const { config } = require('dotenv');
const { MongoClient } = require('mongodb');

module.exports.up = function (next) {
  config();

  MongoClient.connect(process.env.MONGODB_URI, { useUnifiedTopology: true })
    .then((client) => client.db())
    .then((db) => db.collection('players'))
    .then((collection) =>
      collection.updateMany({}, { $set: { cooldownLevel: 0 } }),
    )
    .then(() => next());
};
