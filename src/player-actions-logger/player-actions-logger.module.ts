import { GamesModule } from '@/games/games.module';
import { PlayersModule } from '@/players/players.module';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PlayerActionEntry,
  playerActionEntrySchema,
} from './models/player-action-entry';
import { PlayerActionLoggerService } from './services/player-action-logger.service';
import { PlayerActionLogsController } from './controllers/player-action-logs.controller';
import { PlayerActionsRepositoryService } from './services/player-actions-repository.service';

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
  providers: [PlayerActionLoggerService, PlayerActionsRepositoryService],
  exports: [PlayerActionLoggerService],
  controllers: [PlayerActionLogsController],
})
export class PlayerActionsLoggerModule {}
