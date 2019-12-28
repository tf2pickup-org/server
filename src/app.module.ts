import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypegooseModule } from 'nestjs-typegoose';
import { ConfigModule } from './config/config.module';
import { ConfigService } from './config/config.service';
import { AuthModule } from './auth/auth.module';
import { PlayersModule } from './players/players.module';
import { ProfileModule } from './profile/profile.module';
import { QueueModule } from './queue/queue.module';
import { GamesModule } from './games/games.module';
import { GameServersModule } from './game-servers/game-servers.module';
import { SharedModule } from './shared/shared.module';
import { DiscordModule } from './discord/discord.module';

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
      imports: [ ConfigModule ],
      inject: [ ConfigService ],
      useFactory: async (configService: ConfigService) => ({
        uri: createMongodbUri(configService.get('MONGODB_HOST'), configService.get('MONGODB_POST'), configService.get('MONGODB_DB'),
          configService.get('MONGODB_USERNAME'), configService.get('MONGODB_PASSWORD')),
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }),
    }),
    ConfigModule,
    AuthModule,
    PlayersModule,
    ProfileModule,
    GameServersModule,
    GamesModule,
    QueueModule,
    SharedModule,
    DiscordModule,
  ],
  controllers: [ AppController ],
  providers: [ AppService ],
})
export class AppModule { }
