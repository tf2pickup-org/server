/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

//
// Keys used to sign & verify JWT tokens are not stored in .keystore file anymore -
// they are moved to the database.
//

const { MongoClient } = require('mongodb');
const { config } = require('dotenv');
const { promisify } = require('util');
const fs = require('fs');

const readFile = promisify(fs.readFile);

module.exports.up = (next) => {
  config();

  if (
    !process.env.KEY_STORE_FILE ||
    !fs.existsSync(process.env.KEY_STORE_FILE)
  ) {
    next();
    return;
  }

  Promise.all([
    MongoClient.connect(process.env.MONGODB_URI, {
      useUnifiedTopology: true,
    }).then((client) => client.db()),
    readFile(process.env.KEY_STORE_FILE),
  ])
    .then(([db, keystore]) => {
      const data = JSON.parse(keystore);
      return Promise.all(
        Object.keys(data).map((name) => {
          const { publicKey, privateKey } = data[name];
          return db.collection('keys').updateOne(
            { name },
            {
              $set: {
                publicKeyEncoded: publicKey,
                privateKeyEncoded: privateKey,
              },
            },
            { upsert: true },
          );
        }),
      );
    })
    .then(() =>
      console.log(
        `Your keys were migrated successfully. You can now safely delete ${process.env.KEY_STORE_FILE}.`,
      ),
    )
    .then(next)
    .catch((error) => console.warn(`${error}`));
};
