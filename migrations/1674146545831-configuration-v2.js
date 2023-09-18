/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

const { config } = require('dotenv');
const { MongoClient } = require('mongodb');

module.exports.up = function (next) {
  config();

  MongoClient.connect(process.env.MONGODB_URI, { useUnifiedTopology: true })
    .then((client) => client.db())
    .then((db) => [db, db.collection('configuration')])
    .then(([db, collection]) =>
      Promise.all([db, collection, collection.find({}).toArray()]),
    )
    .then(([db, collection, configuration]) => [
      db,
      collection,
      configuration.map((entry) => {
        switch (entry.key) {
          case 'default player skill':
            return {
              key: 'games.default_player_skill',
              value: entry.value,
            };

          case 'whitelist id':
            return {
              key: 'games.whitelist_id',
              value: entry.value !== '' ? entry.value : undefined,
            };

          case 'etf2l account required':
            return {
              key: 'players.etf2l_account_required',
              value: entry.value,
            };

          case 'minimum tf2 in-game hours':
            return {
              key: 'players.minimum_in_game_hours',
              value: entry.value,
            };

          case 'deny players with no skill assigned':
            return {
              key: 'queue.deny_players_with_no_skill_assigned',
              value: entry.value,
            };

          case 'voice server':
            return [
              {
                key: 'games.voice_server_type',
                value: entry.type,
              },
              {
                key: 'games.voice_server.static_link',
                value: entry.staticLink,
              },
              {
                key: 'games.voice_server.mumble.url',
                value: entry.mumble?.url,
              },
              {
                key: 'games.voice_server.mumble.port',
                value: entry.mumble?.port,
              },
              {
                key: 'games.voice_server.mumble.channel_name',
                value: entry.mumble?.channelName,
              },
              {
                key: 'games.voice_server.mumble.password',
                value: entry.mumble?.password,
              },
            ];

          case 'serveme-tf':
            return {
              key: 'serveme_tf.preferred_region',
              value: entry.preferredRegion,
            };
        }
      }),
    ])
    .then(([db, collection, configuration]) => [
      db,
      collection,
      configuration.flat().filter(({ value }) => value !== undefined),
    ])
    .then(([db, collection, configuration]) => [
      db,
      collection.drop(),
      configuration,
    ])
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .then(([db, _, configuration]) => [db, configuration])
    .then(([db, configuration]) => [
      db,
      db.collection('configuration'),
      configuration,
    ])
    .then(([, collection, configuration]) =>
      configuration.map((entry) => collection.insertOne(entry)),
    )
    .then(() => next());
};
