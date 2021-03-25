/* eslint-disable @typescript-eslint/no-var-requires */
'use strict'

//
// Set deleted to false on all game servers that do not have the 'deleted' property.
//

const { config } = require('dotenv');
const { MongoClient } = require('mongodb');

module.exports.up = next => {
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
    .then(client => client.db())
    .then(db => db.collection('gameservers'))
    .then(collection => collection.updateMany(
      {
        deleted: { $exists: false },
      },
      {
        $set: { deleted: false },
      },
    ))
    .then(() => next());
}
