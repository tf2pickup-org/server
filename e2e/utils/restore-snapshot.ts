import { config } from 'dotenv';
import {
  MongoTransferer,
  MongoDBDuplexConnector,
  LocalFileSystemDuplexConnector,
} from 'mongodb-snapshot';
import { format, parse } from 'mongodb-uri';
import { resolve } from 'path';

const restoreSnapshot = async () => {
  config();

  const { database, ...uriData } = parse(process.env.MONGODB_URI);

  const mongoConnector = new MongoDBDuplexConnector({
    connection: {
      uri: format(uriData),
      dbname: database,
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
