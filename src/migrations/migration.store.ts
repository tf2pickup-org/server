// https://github.com/tj/node-migrate/blob/main/examples/custom-state-storage/mongo-state-storage.js

interface MigrationSet {
  lastRun: string;
  migrations: any[];
}

export interface MigrationStore {
  load: (callback: (error: any, data: MigrationSet) => any) => any;
  save: (set: MigrationSet, callback: (error: any, result: any) => any) => any;
}
