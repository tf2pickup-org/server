import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Environment } from './environment/environment';
import { AuthModule } from './auth/auth.module';
import { PlayersModule } from './players/players.module';
import { ProfileModule } from './profile/profile.module';
import { QueueModule } from './queue/queue.module';
import { GamesModule } from './games/games.module';
import { GameServersModule } from './game-servers/game-servers.module';
import { SharedModule } from './shared/shared.module';
import { EnvironmentModule } from './environment/environment.module';
import { ConfigModule } from '@nestjs/config';
import validationSchema from './environment-validation-schema';
import { ScheduleModule } from '@nestjs/schedule';
import { DocumentsModule } from './documents/documents.module';
import { ConsoleModule } from 'nestjs-console';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { EventsModule } from './events/events.module';
import { PlayerPreferencesModule } from './player-preferences/player-preferences.module';
import { ConfigurationModule } from './configuration/configuration.module';
import { PluginsModule } from './plugins/plugins.module';
import { LogReceiverModule } from './log-receiver/log-receiver.module';
import { createMongoDbUri } from './utils/create-mongo-db-uri';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
      validationOptions: {
        abortEarly: true,
      },
    }),
    MongooseModule.forRootAsync({
      imports: [EnvironmentModule],
      inject: [Environment],
      useFactory: async (environment: Environment) => ({
        uri: createMongoDbUri({
          host: environment.mongoDbHost,
          port: environment.mongoDbPort,
          database: environment.mongoDbName,
          username: environment.mongoDbUsername,
          password: environment.mongoDbPassword,
        }),
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
        useCreateIndex: true,
      }),
    }),
    ScheduleModule.forRoot(),
    ConsoleModule,
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
    SharedModule,
    DocumentsModule,
    EventsModule,
    PlayerPreferencesModule,
    ConfigurationModule,
    PluginsModule.configure(),
    LogReceiverModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
