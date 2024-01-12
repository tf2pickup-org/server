'use strict';

const { config } = require('dotenv');
const { MongoClient, ObjectId } = require('mongodb');

module.exports.up = async function (next) {
  config();

  const mongo = await MongoClient.connect(process.env.MONGODB_URI);
  const gamesWithServemeTfReservation = await mongo
    .db()
    .collection('games')
    .find({ 'gameServer.provider': 'serveme.tf' })
    .toArray();

  for (const game of gamesWithServemeTfReservation) {
    const reservation = await mongo
      .db()
      .collection('servemetfreservations')
      .findOne({ _id: new ObjectId(game.gameServer.id) });

    if (reservation) {
      await mongo
        .db()
        .collection('games')
        .updateOne(
          { _id: game._id },
          { $set: { 'gameServer.id': reservation.reservationId } },
        );
    }
  }

  await mongo.db().collection('servemetfreservations').drop();
  next();
};
