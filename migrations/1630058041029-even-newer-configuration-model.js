/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

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

  const fixupConfigurationEntry = (collection, key) => {
    return collection
      .findOne({ key })
      .then((result) => JSON.parse(result.value))
      .then((value) =>
        collection.findOneAndUpdate({ key }, { $set: { value } }),
      )
      .catch(() => null);
  };

  MongoClient.connect(uri, { useUnifiedTopology: true })
    .then((client) => client.db())
    .then((db) => db.collection('configuration'))
    .then((collection) =>
      Promise.all([
        collection,
        fixupConfigurationEntry(collection, 'default player skill'),
        fixupConfigurationEntry(collection, 'whitelist id'),
        fixupConfigurationEntry(collection, 'etf2l account required'),
        fixupConfigurationEntry(collection, 'minimum tf2 in-game hours'),
      ]),
    )
    .then(([collection]) =>
      Promise.all([collection, collection.deleteOne({ key: 'voice server' })]),
    )
    .then(() => next());
};
