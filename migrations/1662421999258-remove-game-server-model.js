/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

const { config } = require('dotenv');
const { MongoClient, ObjectId } = require('mongodb');

module.exports.up = function (next) {
  config();

  let gamesMigrated = 0;
  let gameServersMigrated = 0;

  MongoClient.connect(process.env.MONGODB_URI, { useUnifiedTopology: true })
    .then((client) => client.db())
    .then((db) =>
      Promise.all([
        db,
        db
          .collection('games')
          .find({})
          .toArray()
          .then((games) =>
            Promise.all(
              games.map((game) => {
                if (game.gameServer && game.gameServer instanceof ObjectId) {
                  return db
                    .collection('gameservers')
                    .findOne({ _id: game.gameServer })
                    .then((gameServer) => {
                      if (gameServer) {
                        return db
                          .collection('games')
                          .updateOne(
                            { _id: game._id },
                            {
                              $set: {
                                gameServer: {
                                  id: gameServer._id.toString(),
                                  name: gameServer.name,
                                  address: gameServer.address,
                                  port: parseInt(gameServer.port, 10),
                                  provider: gameServer.provider,
                                },
                              },
                            },
                          )
                          .then(() => {
                            gamesMigrated += 1;
                          });
                      } else {
                        return db
                          .collection('games')
                          .updateOne(
                            { _id: game._id },
                            {
                              $unset: {
                                gameServer: 1,
                              },
                            },
                          )
                          .then(() => {
                            gamesMigrated += 1;
                          });
                      }
                    });
                }
              }),
            ),
          ),
      ]),
    )
    .then(([db]) =>
      Promise.all([
        db,
        db
          .collection('gameservers')
          .find({
            provider: 'static',
          })
          .toArray()
          .then((staticGameServers) =>
            Promise.all(
              staticGameServers.map((staticGameServer) =>
                db
                  .collection('staticgameservers')
                  .insertOne({
                    _id: staticGameServer._id,
                    __v: staticGameServer.__v,
                    address: staticGameServer.address,
                    port: staticGameServer.port,
                    createdAt: staticGameServer.createdAt,
                    internalIpAddress: staticGameServer.internalIpAddress,
                    isOnline: staticGameServer.isOnline,
                    lastHeartbeat: staticGameServer.lastHeartbeat,
                    name: staticGameServer.name,
                    priority: staticGameServer.priority,
                    rconPassword: staticGameServer.rconPassword,
                  })
                  .then(() => {
                    gameServersMigrated += 1;
                  }),
              ),
            ),
          )
          .then(() =>
            db.collection('gameservers').deleteMany({ provider: 'static' }),
          ),
      ]),
    )
    .then(() =>
      console.log(
        `Migrated ${gamesMigrated} games, ${gameServersMigrated} gameservers`,
      ),
    )
    .then(() => next());
};
