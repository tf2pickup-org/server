/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

//
// Follow-up to the extended-player-roles migration.
//

const { config } = require('dotenv');
const { MongoClient } = require('mongodb');

module.exports.up = (next) => {
  config();

  MongoClient.connect(process.env.MONGODB_URI, { useUnifiedTopology: true })
    .then((client) => client.db())
    .then((db) => db.collection('players'))
    .then((collection) =>
      Promise.all([
        collection,
        collection.updateMany(
          {
            role: null,
          },
          {
            $set: { roles: [] },
            $unset: { role: 1 },
          },
        ),
      ]),
    )
    .then(() => next());
};
