import { promises as fs } from 'fs';
import { MongoClient } from 'mongodb';
import { mongoDbUri } from '../src/utils/mongoDbUri';
import { config } from 'dotenv';

const teardown = async () => {
  config({
    path: 'e2e/e2e.env',
  });

  try {
    await fs.unlink('.keystore.e2e-test');
  // eslint-disable-next-line no-empty
  } catch (error) { }

  const client = await MongoClient.connect(mongoDbUri({
    host: process.env.MONGODB_HOST,
    port: process.env.MONGODB_PORT,
  }));

  await client.db(process.env.MONGODB_DB).dropDatabase();
  console.log(`Dropped ${process.env.MONGODB_DB}`);
};

export default teardown;
