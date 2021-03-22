import { MongoClient } from 'mongodb';
import { mongoDbUri } from '../src/utils/mongoDbUri';
import { config } from 'dotenv';

const teardown = async () => {
  config({
    path: 'e2e/e2e.env',
  });

  const client = await MongoClient.connect(mongoDbUri({
    host: process.env.MONGODB_HOST,
    port: process.env.MONGODB_PORT,
  }), {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  await client.db(process.env.MONGODB_DB).dropDatabase();
  console.log(`Dropped ${process.env.MONGODB_DB}`);
};

export default teardown;
