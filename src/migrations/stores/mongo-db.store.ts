import { Connection } from 'mongoose';
import { MigrationStore } from '../migration.store';

export class MongoDbStore implements MigrationStore {
  constructor(private connection: Connection) {}

  async load(callback) {
    const data = await this.connection.db.collection('migrations').findOne({});
    return callback(null, data ?? {});
  }

  async save(data, callback) {
    const result = await this.connection.db.collection('migrations').updateOne(
      {},
      {
        $set: {
          lastRun: data.lastRun,
        },
        $push: {
          migrations: { $each: data.migrations },
        },
      },
      {
        upsert: true,
      },
    );

    return callback(null, result);
  }
}
