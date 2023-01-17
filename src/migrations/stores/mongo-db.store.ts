import { Connection } from 'mongoose';
import { MigrationSet, MigrationStore } from '../migration.store';

export class MongoDbStore implements MigrationStore {
  constructor(private connection: Connection) {}

  // skipcq: JS-0323
  async load(callback: (error: unknown, data: MigrationSet) => any) {
    const data = await this.connection.db.collection('migrations').findOne({});
    // skipcq: JS-0323
    return callback(null, (data ?? {}) as any);
  }

  // skipcq: JS-0323
  async save(set: MigrationSet, callback: (error: any, result: any) => any) {
    const result = await this.connection.db.collection('migrations').updateOne(
      {},
      {
        $set: {
          lastRun: set.lastRun,
        },
        $push: {
          migrations: { $each: set.migrations },
        },
      },
      {
        upsert: true,
      },
    );

    return callback(null, result);
  }
}
