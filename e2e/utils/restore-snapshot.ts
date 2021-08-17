import { config } from 'dotenv';
import {
  MongoTransferer,
  MongoDBDuplexConnector,
  LocalFileSystemDuplexConnector,
} from 'mongodb-snapshot';
import { resolve } from 'path';
import { createMongoDbUri } from '../../src/utils/create-mongo-db-uri';

const restoreSnapshot = async () => {
  config();

  const mongoConnector = new MongoDBDuplexConnector({
    connection: {
      uri: createMongoDbUri({
        host: process.env.MONGODB_HOST,
        port: process.env.MONGODB_PORT,
      }),
      dbname: process.env.MONGODB_DB,
    },
    astarget: {
      remove_on_startup: true,
    },
  });

  const localFileConnector = new LocalFileSystemDuplexConnector({
    connection: {
      path: resolve(__dirname, '..', 'snapshot.tar'),
    },
  });

  const transferer = new MongoTransferer({
    source: localFileConnector,
    targets: [mongoConnector],
  });

  for await (const { total, write } of transferer) {
    console.log(`remaining bytes to write: ${total - write}`);
  }

  console.log(`${process.env.MONGODB_DB}: snapshot restored`);
};

restoreSnapshot();
