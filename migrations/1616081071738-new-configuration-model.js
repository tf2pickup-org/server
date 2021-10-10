/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

//
// Remove the old configuration collection, it is going to be replaced with the new, better one.
//

const { config } = require('dotenv');
const { MongoClient } = require('mongodb');

module.exports.up = (next) => {
  config();

  MongoClient.connect(process.env.MONGODB_URI, { useUnifiedTopology: true })
    .then((client) => client.db())
    .then((db) => db.collection('configuration'))
    .then((collection) => Promise.all([collection, collection.isCapped()]))
    .then(([collection, isCapped]) => {
      if (isCapped) {
        return collection
          .findOne()
          .then((configuration) => {
            console.log('Configuration:');
            for (const [key, value] of Object.entries(configuration)) {
              if (key !== '_id' && key !== '__v') {
                console.log(
                  `${key}: ${
                    typeof value === 'object' && value !== null
                      ? JSON.stringify(value)
                      : value
                  }`,
                );
              }
            }
          })
          .then(() => collection.drop())
          .then(() => console.log('Configuration wiped.'));
      } else {
        return Promise.resolve();
      }
    })
    .then(next);
};
