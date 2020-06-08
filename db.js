//
// required for migrations
//
require('dotenv').config();

let credentials = '';
if (process.env.MONGODB_USERNAME) {
  if (process.env.MONGODB_PASSWORD) {
    credentials = `${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@`;
  } else {
    credentials = `${process.env.MONGODB_USERNAME}@`;
  }
}

module.exports = `mongodb://${credentials}${process.env.MONGODB_HOST}:${process.env.MONGODB_PORT}/${process.env.MONGODB_DB}`;
