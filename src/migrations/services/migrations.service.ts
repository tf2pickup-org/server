import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { MigrationStore } from '../migration.store';
import { FileStore, load } from 'migrate';
import { resolve as pathResolve } from 'path';
import * as appRoot from 'app-root-path';

@Injectable()
export class MigrationsService implements OnApplicationBootstrap {
  private logger = new Logger(MigrationsService.name);

  constructor(
    @Inject('MIGRATION_STORE') private readonly migrationStore: MigrationStore,
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('running migrations...');
    await this.runMigrations();
    this.logger.log('migrations run successfully');
  }

  private runMigrations() {
    return new Promise<void>((resolve, reject) => {
      load(
        {
          stateStore: this.migrationStore as FileStore,
          migrationsDirectory: pathResolve(appRoot.toString(), 'migrations'),
        },
        (error, set) => {
          if (error) {
            return reject(error);
          }

          return set.up((error) => {
            if (error) {
              return reject(error);
            }
            return resolve();
          });
        },
      );
    });
  }
}
