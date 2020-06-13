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
      const Games = db.collection('games');
      return Games.find().forEach(game => {
        game.slots.forEach(slot => {
          if (!slot.team) {
            slot.team = game.teams[slot.teamId].toLowerCase();
          }
        });

        return Games.save(game);
      });
    })
    .then(next);
}

module.exports.down = next => {
  next()
}
