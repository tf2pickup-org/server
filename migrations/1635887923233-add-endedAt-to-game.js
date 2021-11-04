/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

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
        collection.find({ endedAt: { $exists: false } }).toArray(),
      ]),
    )
    .then(([collection, servers]) =>
      Promise.all(
        servers.map((server) => {
          const endedAt = new Date(
            server.launchedAt.getTime() + 1000 * 60 * 45,
          );
          return collection.updateOne(
            { _id: server._id },
            { $set: { endedAt: endedAt } },
          );
        }),
      ),
    )
    .then(() => next());
};
