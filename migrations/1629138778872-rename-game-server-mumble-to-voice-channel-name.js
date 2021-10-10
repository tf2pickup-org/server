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
        collection.find({ mumbleChannelName: { $exists: true } }).toArray(),
      ]),
    )
    .then(([collection, gameServers]) =>
      Promise.all([
        collection,
        ...gameServers.map((gameServer) =>
          collection.updateOne(
            { _id: gameServer._id },
            {
              $set: {
                voiceChannelName: gameServer.mumbleChannelName,
              },
            },
          ),
        ),
      ]),
    )
    .then(([collection]) =>
      collection.updateMany(
        {
          mumbleChannelName: { $exists: true },
        },
        {
          $unset: { mumbleChannelName: true },
        },
      ),
    )
    .then(() => next());
};
