/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

//
// Remove Player.role, use Player.roles instead.
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
            role: 'super-user',
          },
          {
            $set: { roles: ['admin', 'super user'] },
            $unset: { role: 1 },
          },
        ),
      ]),
    )
    .then(([collection]) =>
      Promise.all([
        collection,
        collection.updateMany(
          {
            role: 'admin',
          },
          {
            $set: { roles: ['admin'] },
            $unset: { role: 1 },
          },
        ),
      ]),
    )
    .then(([collection]) =>
      collection.updateMany(
        {
          role: 'bot',
        },
        {
          $set: { roles: ['bot'] },
          $unset: { role: 1 },
        },
      ),
    )
    .then(() => next());
};
