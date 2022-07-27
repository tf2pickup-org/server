import { CacheModule, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { Environment } from './environment/environment';
import { AuthModule } from './auth/auth.module';
import { PlayersModule } from './players/players.module';
import { ProfileModule } from './profile/profile.module';
import { QueueModule } from './queue/queue.module';
import { GamesModule } from './games/games.module';
import { GameServersModule } from './game-servers/game-servers.module';
import { EnvironmentModule } from './environment/environment.module';
import { ConfigModule } from '@nestjs/config';
import { environmentSchema } from './environment-schema';
import { ScheduleModule } from '@nestjs/schedule';
import { DocumentsModule } from './documents/documents.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { EventsModule } from './events/events.module';
import { PlayerPreferencesModule } from './player-preferences/player-preferences.module';
import { ConfigurationModule } from './configuration/configuration.module';
import { PluginsModule } from './plugins/plugins.module';
import { LogReceiverModule } from './log-receiver/log-receiver.module';
import { MongooseModule } from '@nestjs/mongoose';
import { MigrationsModule } from './migrations/migrations.module';
import { formatMongoose } from 'mongodb-uri';
import { StatisticsModule } from './statistics/statistics.module';
import { GameConfigsModule } from './game-configs/game-configs.module';
import { VoiceServersModule } from './voice-servers/voice-servers.module';
import { CertificatesModule } from './certificates/certificates.module';
import type { RedisClientOptions } from '@redis/client';
import { GameCoordinatorModule } from './game-coordinator/game-coordinator.module';
import { LogsTfModule } from './logs-tf/logs-tf.module';
import * as redisStore from 'cache-manager-redis-store';
import * as mongoStore from 'cache-manager-mongodb';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: environmentSchema,
      validationOptions: {
        abortEarly: true,
      },
      expandVariables: true,
    }),
    MongooseModule.forRootAsync({
      imports: [EnvironmentModule],
      inject: [Environment],
      useFactory: async (environment: Environment) => ({
        uri: formatMongoose(environment.mongoDbUri),
      }),
    }),
    CacheModule.registerAsync({
      imports: [EnvironmentModule],
      inject: [Environment],
      useFactory: async (environment: Environment) => {
        if (environment.redisUrl) {
          const redisClientOptions: RedisClientOptions = {
            url: environment.redisUrl,
          };
          return {
            store: redisStore,
            ...redisClientOptions,
          };
        } else {
          return {
            store: mongoStore,
            uri: formatMongoose(environment.mongoDbUri),
          };
        }
      },
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'client'),
    }),

    EnvironmentModule,
    AuthModule,
    PlayersModule,
    ProfileModule,
    GameServersModule,
    GamesModule,
    QueueModule,
    DocumentsModule,
    EventsModule,
    PlayerPreferencesModule,
    ConfigurationModule,
    PluginsModule.configure(),
    LogReceiverModule,
    MigrationsModule,
    StatisticsModule,
    GameConfigsModule,
    VoiceServersModule,
    CertificatesModule,
    GameCoordinatorModule,
    LogsTfModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
