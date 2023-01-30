/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

const { config } = require('dotenv');
const { MongoClient } = require('mongodb');

module.exports.up = function (next) {
  config();

  MongoClient.connect(process.env.MONGODB_URI, { useUnifiedTopology: true })
    .then((client) => client.db())
    .then((db) =>
      Promise.all([db.collection('games'), db.collection('players')]),
    )
    .then(([games, players]) =>
      Promise.all([games, players, players.find({}).toArray()]),
    )
    .then(([games, players, allPlayers]) =>
      Promise.all(
        allPlayers.map((player) =>
          games
            .countDocuments({ state: 'ended', 'slots.player': player._id })
            .then((gamesPlayed) =>
              players.updateOne({ _id: player._id }, { $set: { gamesPlayed } }),
            ),
        ),
      ),
    )
    .then(() => next());
};
