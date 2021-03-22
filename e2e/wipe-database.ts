import { mongoDbUri } from '@/utils/mongoDbUri';
import { MongoClient } from 'mongodb';

export const wipeDatabase = async () => {
  const client = await MongoClient.connect(mongoDbUri({
    host: process.env.MONGODB_HOST,
    port: process.env.MONGODB_PORT,
  }));

  await client.db(process.env.MONGODB_DB).dropDatabase();
  console.log(`Dropped ${process.env.MONGODB_DB}`);
};
