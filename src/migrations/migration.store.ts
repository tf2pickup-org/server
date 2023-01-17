// https://github.com/tj/node-migrate/blob/main/examples/custom-state-storage/mongo-state-storage.js

export interface MigrationSet {
  lastRun?: string;
  // skipcq: JS-0323
  migrations?: any[];
}

export interface MigrationStore {
  // skipcq: JS-0323
  load: (callback: (error: any, data: MigrationSet) => any) => any;
  // skipcq: JS-0323
  save: (set: MigrationSet, callback: (error: any, result: any) => any) => any;
}
