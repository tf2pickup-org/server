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
