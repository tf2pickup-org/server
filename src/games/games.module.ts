import { Module } from '@nestjs/common';
import { GamesService } from './services/games.service';
import { TypegooseModule } from 'nestjs-typegoose';
import { Game } from './models/game';
import { PlayersModule } from '@/players/players.module';
import { QueueModule } from '@/queue/queue.module';

@Module({
  imports: [
    TypegooseModule.forFeature([ Game ]),
    PlayersModule,
    QueueModule,
  ],
  providers: [
    GamesService,
  ],
})
export class GamesModule { }
