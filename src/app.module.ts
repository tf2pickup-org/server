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
    TypegooseModule.forRootAsync({
      imports: [ EnvironmentModule ],
      inject: [ Environment ],
      useFactory: async (environment: Environment) => ({
        uri: createMongodbUri(environment),
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }),
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
  ],
  controllers: [
    AppController,
  ],
  providers: [
    AppService,
  ],
})
export class AppModule { }
