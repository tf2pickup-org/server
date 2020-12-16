'use strict'

//
// Player.avatarUrl was replaced by Player.avatar object that represents all avatar's sizes
// provided by Steam.
//

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
    .then(db => db.collection('players')
      .updateMany(
        {
          avatar: { $exists: false },
          role: { $ne: 'bot' },
        },
        [
          { $set: {
            avatar: {
              small: '$avatarUrl',
              medium: {
                $replaceOne: {
                  input: '$avatarUrl',
                  find: '.jpg',
                  replacement: '_medium.jpg',
                },
              },
              large: {
                $replaceOne: {
                  input: '$avatarUrl',
                  find: '.jpg',
                  replacement: '_full.jpg',
                },
              },
            },
          } },
      ])
    )
    .then(() => next());
}

module.exports.down = function (next) {
  next()
}
