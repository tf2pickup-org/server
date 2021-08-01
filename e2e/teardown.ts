import { MongoClient } from 'mongodb';
import { createMongoDbUri } from '../src/utils/create-mongo-db-uri';

const teardown = async () => {
  const client = await MongoClient.connect(
    createMongoDbUri({
      host: process.env.MONGODB_HOST,
      port: process.env.MONGODB_PORT,
    }),
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  );

  await client.db(process.env.MONGODB_DB).dropDatabase();
  console.log(`Dropped ${process.env.MONGODB_DB}`);
};

export default teardown;
