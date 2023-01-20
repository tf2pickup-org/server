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
      Promise.all([
        collection,
        collection.find({ joinedAt: { $exists: true, $type: 2 } }).toArray(),
      ]),
    )
    .then(([collection, players]) =>
      players.map((player) =>
        collection.updateOne(
          { _id: player._id },
          { $set: { joinedAt: new Date(player.joinedAt) } },
        ),
      ),
    )
    .then(() => next());
};
