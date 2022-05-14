import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { MigrationStore } from '../migration.store';
import { load } from 'migrate';
import { resolve as pathResolve } from 'path';
import * as appRoot from 'app-root-path';

@Injectable()
export class MigrationsService implements OnApplicationBootstrap {
  private logger = new Logger(MigrationsService.name);

  constructor(
    @Inject('MIGRATION_STORE') private migrationStore: MigrationStore,
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('running migrations...');
    try {
      await this.runMigrations();
      this.logger.log('migrations run successfully');
    } catch (error) {
      this.logger.error(error);
    }
  }

  private async runMigrations() {
    return new Promise<void>((resolve, reject) => {
      load(
        {
          stateStore: this.migrationStore,
          migrationsDirectory: pathResolve(appRoot.toString(), 'migrations'),
        },
        (error, set) => {
          if (error) {
            return reject(error);
          }

          set.up((error) => {
            if (error) {
              return reject(error);
            }
            resolve();
          });
        },
      );
    });
  }
}
