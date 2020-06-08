'use strict'

const uri = require('../db');
const mongodb = require('mongodb');

module.exports.up = function (next) {
  mongodb.MongoClient.connect(uri, { useUnifiedTopology: true })
    .then(client => client.db())
    .then(db => {
      const Games = db.collection('games');
      return Games.find().forEach(game => {
        game.slots.forEach(slot => {
          if (!slot.player) {
            slot.player = slot.playerId;
          }
        });

        return Games.save(game);
      });
    })
    .then(next);
}

module.exports.down = function (next) {
  next()
}
