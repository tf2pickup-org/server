/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

const { config } = require('dotenv');
const { MongoClient } = require('mongodb');

module.exports.up = (next) => {
  config();

  const fixupConfigurationEntry = (collection, key) => {
    return collection
      .findOne({ key })
      .then((result) => JSON.parse(result.value))
      .then((value) =>
        collection.findOneAndUpdate({ key }, { $set: { value } }),
      )
      .catch(() => null);
  };

  MongoClient.connect(process.env.MONGODB_URI, { useUnifiedTopology: true })
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
      // It's ok to wipe voice server configuration, as at the time of writing this migration, voice server
      // configuration is not a part of any release yet.
      Promise.all([collection, collection.deleteOne({ key: 'voice server' })]),
    )
    .then(() => next());
};
