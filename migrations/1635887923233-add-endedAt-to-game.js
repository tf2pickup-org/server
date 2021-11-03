'use strict'

const { config } = require('dotenv');
const { MongoClient } = require('mongodb');

module.exports.up = (next) => {
  config();

  MongoClient.connect(process.env.MONGODB_URI, { useUnifiedTopology: true })
    .then((client) => client.db())
    .then((db) => db.collection('games'))
    .then((collection) =>
      Promise.all([
        collection,
        collection.updateMany({}, { $set: { endedAt: { $add: ["$launchedAt", 1000 * 60 * 45]} } }),
      ]),
    )
    .then(() => next());
};
