'use strict';

const { config } = require('dotenv');
const { MongoClient } = require('mongodb');

module.exports.up = async function (next) {
  config();

  const mongo = await MongoClient.connect(process.env.MONGODB_URI);
  const collection = mongo.db().collection('servemetfreservations');
  await collection.drop();

  next();
};
