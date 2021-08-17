import {
  MongoTransferer,
  MongoDBDuplexConnector,
  LocalFileSystemDuplexConnector,
} from 'mongodb-snapshot';
import { config } from 'dotenv';
import { createMongoDbUri } from '../../src/utils/create-mongo-db-uri';

async function dumpMongo2Localfile() {
  config();

  const mongo_connector = new MongoDBDuplexConnector({
    connection: {
      uri: createMongoDbUri({
        host: process.env.MONGODB_HOST,
        port: process.env.MONGODB_PORT,
      }),
      dbname: process.env.MONGODB_DB,
    },
  });

  const localfile_connector = new LocalFileSystemDuplexConnector({
    connection: {
      path: './snapshot.tar',
    },
  });

  const transferer = new MongoTransferer({
    source: mongo_connector,
    targets: [localfile_connector],
  });

  for await (const { total, write } of transferer) {
    console.log(`remaining bytes to write: ${total - write}`);
  }
}

dumpMongo2Localfile();
