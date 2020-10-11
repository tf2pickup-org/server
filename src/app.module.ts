import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypegooseModule } from 'nestjs-typegoose';
import { Environment } from './environment/environment';
import { AuthModule } from './auth/auth.module';
import { PlayersModule } from './players/players.module';
import { ProfileModule } from './profile/profile.module';
import { QueueModule } from './queue/queue.module';
import { GamesModule } from './games/games.module';
import { GameServersModule } from './game-servers/game-servers.module';
import { SharedModule } from './shared/shared.module';
import { DiscordModule } from './discord/discord.module';
import { EnvironmentModule } from './environment/environment.module';
import { ConfigModule } from '@nestjs/config';
import validationSchema from './environment-validation-schema';
import { ScheduleModule } from '@nestjs/schedule';
import { DocumentsModule } from './documents/documents.module';
import { ConsoleModule } from 'nestjs-console';
import { TwitchModule } from './twitch/twitch.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

function createMongodbUri(environment: Environment) {
  let credentials = '';
  if (environment.mongoDbUsername) {
    if (environment.mongoDbPassword) {
      credentials = `${environment.mongoDbUsername}:${environment.mongoDbPassword}@`;
    } else {
      credentials = `${environment.mongoDbUsername}@`;
    }
  }
  return `mongodb://${credentials}${environment.mongoDbHost}:${environment.mongoDbPort}/${environment.mongoDbName}`;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
      validationOptions: {
        abortEarly: true,
      },
    }),
    TypegooseModule.forRootAsync({
      imports: [ EnvironmentModule ],
      inject: [ Environment ],
      useFactory: async (environment: Environment) => ({
        uri: createMongodbUri(environment),
        useNewUrlParser: true,
        useUnifiedTopology: true,
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
    DiscordModule,
    DocumentsModule,
    TwitchModule,
  ],
  controllers: [
    AppController,
  ],
  providers: [
    AppService,
  ],
})
export class AppModule { }
