import { Events } from '@/events/events';
import { Game } from '@/games/models/game';
import { PlayerConnectionStatus } from '@/games/models/player-connection-status';
import { GamesService } from '@/games/services/games.service';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { filter } from 'rxjs';

@Injectable()
export class PlayerBehaviorHandlerService implements OnModuleInit {
  private logger = new Logger(PlayerBehaviorHandlerService.name);
  // game id <-> timeout pairs
  private timeouts = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly events: Events,
    private readonly gamesService: GamesService,
  ) {}

  onModuleInit() {
    this.events.gameChanges
      .pipe(
        filter(
          ({ oldGame, newGame }) =>
            oldGame.connectInfoVersion !== newGame.connectInfoVersion,
        ),
      )
      .subscribe(
        async ({ newGame }) => await this.verifyPlayersConnected(newGame),
      );
  }

  async verifyPlayersConnected(game: Game) {
    if (!game.connectString) {
      this.timeouts.delete(game.id);
      return;
    }

    const timeout = setTimeout(async () => {
      const nowGame = await this.gamesService.getById(game.id);
      nowGame
        .activeSlots()
        .filter(
          (slot) => slot.connectionStatus === PlayerConnectionStatus.offline,
        )
        .forEach((slot) =>
          this.logger.log(`player ${slot.player} has not joined on time`),
        );
    }, 60 * 1000);
    this.timeouts.set(game.id, timeout);
  }
}
