/* eslint-disable @typescript-eslint/no-var-requires */
'use strict'

//
// Keys used to sign & verify JWT tokens are not stored in .keystore file anymore -
// they are moved to the database.
//

const { MongoClient } = require('mongodb');
const { config } = require('dotenv');
const { promisify } = require('util');
const fs = require('fs');

const readFile = promisify(fs.readFile);

module.exports.up = next => {
  config();

  if (!fs.existsSync(process.env.KEY_STORE_FILE)) {
    next();
    return;
  }

  let credentials = '';
  if (process.env.MONGODB_USERNAME) {
    if (process.env.MONGODB_PASSWORD) {
      credentials = `${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@`;
    } else {
      credentials = `${process.env.MONGODB_USERNAME}@`;
    }
  }

  const uri = `mongodb://${credentials}${process.env.MONGODB_HOST}:${process.env.MONGODB_PORT}/${process.env.MONGODB_DB}`;

  Promise.all([
    MongoClient.connect(uri, { useUnifiedTopology: true }).then(client => client.db()),
    readFile(process.env.KEY_STORE_FILE),
  ]).then(([db, keystore]) => {
    const data = JSON.parse(keystore);
    return Promise.all(Object.keys(data).map(name => {
      const { publicKey, privateKey } = data[name];
      return db.collection('keys').updateOne({ name },
        { $set: {
          publicKeyEncoded: publicKey,
          privateKeyEncoded: privateKey,
        } }, { upsert: true });
    }));
  }).then(() => console.log(`Your keys were migrated successfully. You can now safely delete ${process.env.KEY_STORE_FILE}.`))
    .then(next)
    .catch(error => console.warn(`${error}`));
}
