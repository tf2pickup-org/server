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

function createMongodbUri(host: string, port: string, db: string, username: string, password: string) {
  let credentials = '';
  if (username) {
    if (password) {
      credentials = `${username}:${password}@`;
    } else {
      credentials = `${username}@`;
    }
  }
  return `mongodb://${credentials}${host}:${port}/${db}`;
}

@Module({
  imports: [
    TypegooseModule.forRootAsync({
      imports: [ EnvironmentModule ],
      inject: [ Environment ],
      useFactory: async (environment: Environment) => ({
        uri: createMongodbUri(environment.get('MONGODB_HOST'), environment.get('MONGODB_POST'), environment.get('MONGODB_DB'),
          environment.get('MONGODB_USERNAME'), environment.get('MONGODB_PASSWORD')),
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
