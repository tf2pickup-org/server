import { Module } from '@nestjs/common';
import { GamesService } from './services/games.service';
import { TypegooseModule } from 'nestjs-typegoose';
import { Game } from './models/game';
import { PlayersModule } from '@/players/players.module';
import { QueueModule } from '@/queue/queue.module';
import { ConfigModule } from '@/config/config.module';
import { GameServersModule } from '@/game-servers/game-servers.module';

@Module({
  imports: [
    TypegooseModule.forFeature([ Game ]),
    ConfigModule,
    GameServersModule,
    PlayersModule,
    QueueModule,
  ],
  providers: [
    GamesService,
  ],
})
export class GamesModule { }
