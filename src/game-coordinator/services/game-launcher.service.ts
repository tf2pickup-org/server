import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ServerConfiguratorService } from './server-configurator.service';
import { GamesService } from '@/games/services/games.service';
import { Game } from '@/games/models/game';
import { Events } from '@/events/events';
import { filter } from 'rxjs';

/**
 * This service is responsible for launching a single game.
 *
 * @export
 * @class GameLauncherService
 */
@Injectable()
export class GameLauncherService implements OnModuleInit {
  private readonly logger = new Logger(GameLauncherService.name);

  constructor(
    private readonly gamesService: GamesService,
    private readonly serverConfiguratorService: ServerConfiguratorService,
    private readonly events: Events,
  ) {}

  onModuleInit() {
    // when a gameserver is assigned to a game, we can configure the gameserver
    this.events.gameChanges
      .pipe(
        filter(
          ({ oldGame, newGame }) =>
            JSON.stringify(oldGame.gameServer) !==
            JSON.stringify(newGame.gameServer),
        ),
      )
      .subscribe(async ({ newGame }) => await this.configureServer(newGame.id));
  }

  private async configureServer(gameId: string): Promise<Game> {
    let game = await this.gamesService.getById(gameId);

    try {
      game = await this.gamesService.update(game.id, {
        $unset: {
          connectString: 1,
          stvConnectString: 1,
        },
        $inc: {
          connectInfoVersion: 1,
        },
      });

      const { connectString, stvConnectString } =
        await this.serverConfiguratorService.configureServer(game.id);

      game = await this.gamesService.update(game.id, {
        $set: {
          connectString,
          stvConnectString,
        },
        $inc: {
          connectInfoVersion: 1,
        },
      });

      this.logger.verbose(`game #${game.number} configured`);
      return game;
    } catch (error) {
      this.logger.error(`error launching game #${game.number}: ${error}`);
    }
  }
}
