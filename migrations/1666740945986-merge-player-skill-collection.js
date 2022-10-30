/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

const { config } = require('dotenv');
const { MongoClient } = require('mongodb');

module.exports.up = function (next) {
  config();

  MongoClient.connect(process.env.MONGODB_URI, { useUnifiedTopology: true })
    .then((client) => client.db())
    .then((db) =>
      Promise.all([
        db,
        db
          .collection('playerskills')
          .find({})
          .toArray()
          .then((skills) =>
            Promise.all(
              skills.map((skill) => {
                return db
                  .collection('players')
                  .updateOne(
                    { _id: skill.player },
                    { $set: { skill: skill.skill } },
                  )
                  .catch((reason) => {
                    console.error(
                      `could not migrate skill for playerId=${skill.player} (${reason})`,
                    );
                  });
              }),
            ),
          ),
      ]),
    )
    .then(([db]) => db.collection('playerskills').drop())
    .then(() => next())
    .catch((error) => {
      if (error.message === 'ns not found') {
        next();
      } else {
        throw error;
      }
    });
};
