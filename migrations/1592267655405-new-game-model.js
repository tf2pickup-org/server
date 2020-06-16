'use strict'

const mongodb = require('mongodb');
require('dotenv').config();

let credentials = '';
if (process.env.MONGODB_USERNAME) {
  if (process.env.MONGODB_PASSWORD) {
    credentials = `${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@`;
  } else {
    credentials = `${process.env.MONGODB_USERNAME}@`;
  }
}

const uri = `mongodb://${credentials}${process.env.MONGODB_HOST}:${process.env.MONGODB_PORT}/${process.env.MONGODB_DB}`;

module.exports.up = function (next) {
  mongodb.MongoClient.connect(uri, { useUnifiedTopology: true })
    .then(client => client.db())
    .then(db => {
      db.collection('games')
        .updateMany(
          { 'slots.0.player': { $exists: false } },
          [
            // rename slot.playerId => slot.player (and make it ObjectId)
            // get rid of slot.teamId, use slot.team instead
            // https://github.com/tf2pickup-pl/server/pull/434
            // https://github.com/tf2pickup-pl/server/pull/437
            { $set: {
              slots: {
                $map: {
                  input: '$slots',
                  as: 'x',
                  in: {
                    _id: '$$x._id',
                    player: { $toObjectId: '$$x.playerId' },
                    team: {
                      $cond: {
                        if: { $eq: [ '$$x.teamId', '0' ] },
                        then: 'red',
                        else: 'blu'
                      }
                    },
                    gameClass: '$$x.gameClass',
                    status: '$$x.status',
                    connectionStatus: '$$x.connectionStatus',
                  },
                },
              },
            } },
            // remove obsolete fields
            // https://github.com/tf2pickup-pl/server/pull/437
            { $unset: ['teams', 'players'] },
          ],
          { multi: true }
        )
    })
    .then(next);
}

module.exports.down = function (next) {
  next()
}
