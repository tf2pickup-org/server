import {
  MongoTransferer,
  MongoDBDuplexConnector,
  LocalFileSystemDuplexConnector,
} from 'mongodb-snapshot';
import { config } from 'dotenv';
import { format, parse } from 'mongodb-uri';

async function dumpMongo2Localfile() {
  config();

  const { database, ...uriData } = parse(process.env.MONGODB_URI);

  const mongo_connector = new MongoDBDuplexConnector({
    connection: {
      uri: format(uriData),
      dbname: database,
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
