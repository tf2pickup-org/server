import { GamesModule } from '@/games/games.module';
import { PlayersModule } from '@/players/players.module';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PlayerActionEntry,
  playerActionEntrySchema,
} from './models/player-action-entry';
import { PlayerActionLoggerService } from './services/player-action-logger.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: PlayerActionEntry.name,
        schema: playerActionEntrySchema,
      },
    ]),
    PlayersModule,
    GamesModule,
  ],
  providers: [PlayerActionLoggerService],
  exports: [PlayerActionLoggerService],
})
export class PlayerActionsLoggerModule {}
