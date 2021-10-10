/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

//
// Set deleted to false on all game servers that do not have the 'deleted' property.
//

const { config } = require('dotenv');
const { MongoClient } = require('mongodb');

module.exports.up = (next) => {
  config();

  MongoClient.connect(process.env.MONGODB_URI, { useUnifiedTopology: true })
    .then((client) => client.db())
    .then((db) => db.collection('gameservers'))
    .then((collection) =>
      collection.updateMany(
        {
          deleted: { $exists: false },
        },
        {
          $set: { deleted: false },
        },
      ),
    )
    .then(() => next());
};
