/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

//
// Move Player.twitchTvUser to twitchtvprofiles collection.
//

const { config } = require('dotenv');
const { MongoClient } = require('mongodb');

module.exports.up = (next) => {
  config();

  let credentials = '';
  if (process.env.MONGODB_USERNAME) {
    if (process.env.MONGODB_PASSWORD) {
      credentials = `${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@`;
    } else {
      credentials = `${process.env.MONGODB_USERNAME}@`;
    }
  }

  const uri = `mongodb://${credentials}${process.env.MONGODB_HOST}:${process.env.MONGODB_PORT}/${process.env.MONGODB_DB}`;

  MongoClient.connect(uri, { useUnifiedTopology: true })
    .then((client) => client.db())
    .then((db) =>
      Promise.all([
        db,
        db
          .collection('players')
          .find({ twitchTvUser: { $exists: true } })
          .toArray(),
      ]),
    )
    .then(([db, players]) =>
      Promise.all([
        db,
        players.map((player) =>
          db
            .collection('twitchtvprofiles')
            .insertOne({ player: player._id, ...player.twitchTvUser }),
        ),
      ]),
    )
    .then(([db, players]) => {
      console.log(`migrated ${players.length} player profile(s)`);
      return db;
    })
    .then((db) =>
      db
        .collection('players')
        .updateMany(
          { twitchTvUser: { $exists: true } },
          { $unset: { twitchTvUser: 1 } },
        ),
    )
    .then(() => next());
};
