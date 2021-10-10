/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

const { config } = require('dotenv');
const { MongoClient } = require('mongodb');

module.exports.up = (next) => {
  config();

  if (process.env.MUMBLE_SERVER_URL && process.env.MUMBLE_CHANNEL_NAME) {
    const url = process.env.MUMBLE_SERVER_URL;
    const port = 64738;
    const channelName = process.env.MUMBLE_CHANNEL_NAME;

    MongoClient.connect(process.env.MONGODB_URI, { useUnifiedTopology: true })
      .then((client) => client.db())
      .then((db) => db.collection('configuration'))
      .then((collection) =>
        collection.updateOne(
          { key: 'voice server' },
          {
            $set: {
              value: JSON.stringify({
                url,
                port,
                channelName,
                type: 'mumble',
              }),
            },
          },
        ),
      )
      .then(() =>
        console.warn(
          'Mumble configuration migrated. Please remove MUMBLE_SERVER_URL and MUMBLE_CHANNEL_NAME from your .env file.',
        ),
      )
      .then(() => next());
  } else {
    next();
  }
};
