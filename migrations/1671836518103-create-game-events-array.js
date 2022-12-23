/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

const { config } = require('dotenv');
const { MongoClient } = require('mongodb');

module.exports.up = function (next) {
  config();

  MongoClient.connect(process.env.MONGODB_URI, { useUnifiedTopology: true })
    .then((client) => client.db())
    .then((db) => db.collection('games'))
    .then((collection) =>
      Promise.all([
        collection,
        collection.find({ events: { $exists: false } }).toArray(),
      ]),
    )
    .then(([collection, games]) =>
      Promise.all(
        games.map((game) => {
          return collection.updateOne(
            { _id: game._id },
            {
              $push: {
                events: {
                  $each: [
                    {
                      event: 'created',
                      at: game.launchedAt,
                    },
                    {
                      event: 'ended',
                      at: game.endedAt,
                    },
                  ],
                },
              },
              $unset: {
                launchedAt: 1,
                endedAt: 1,
              },
            },
          );
        }),
      ),
    )
    .then(() => next());
};
