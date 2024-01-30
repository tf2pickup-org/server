import { ConfigurationService } from '@/configuration/services/configuration.service';
import { Events } from '@/events/events';
import { GameId } from '@/games/types/game-id';
import { SlotStatus } from '@/games/models/slot-status';
import { GamesService } from '@/games/services/games.service';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { concatMap, from } from 'rxjs';

@Injectable()
export class AutoEndGamesService implements OnModuleInit {
  private logger = new Logger(AutoEndGamesService.name);

  constructor(
    private readonly events: Events,
    private readonly gamesService: GamesService,
    private readonly configurationService: ConfigurationService,
  ) {}

  onModuleInit() {
    this.events.substituteRequested
      .pipe(concatMap(({ gameId }) => from(this.maybeCloseGame(gameId))))
      .subscribe();
  }

  async maybeCloseGame(gameId: GameId) {
    const game = await this.gamesService.getById(gameId);
    if (!game.isInProgress()) {
      return;
    }

    const threshold = await this.configurationService.get<number>(
      'games.auto_force_end_threshold',
    );
    const subRequests = game.slots.filter(
      (slot) => slot.status === SlotStatus.waitingForSubstitute,
    ).length;
    if (subRequests >= threshold) {
      this.logger.log(
        `game #${game.number} has ${subRequests} substitute requests (threshold=${threshold}); the game will be force-ended`,
      );
      await this.gamesService.forceEnd(gameId);
    }
  }
}
