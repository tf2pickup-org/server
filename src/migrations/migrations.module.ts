import { Module } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { MigrationsService } from './services/migrations.service';
import { MongoDbStore } from './stores/mongo-db.store';

@Module({
  providers: [
    {
      provide: 'MIGRATION_STORE',
      inject: [getConnectionToken()],
      useFactory: (connection: Connection) => new MongoDbStore(connection),
    },
    MigrationsService,
  ],
})
export class MigrationsModule {}
