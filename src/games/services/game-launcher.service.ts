import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { GamesService } from './games.service';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { ServerConfiguratorService } from './server-configurator.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GameState } from '../models/game-state';
import { generateLogsecret } from '@/game-servers/utils/generate-logsecret';
import { Game } from '../models/game';

/**
 * This service is responsible for launching a single game.
 *
 * @export
 * @class GameLauncherService
 */
@Injectable()
export class GameLauncherService {
  private logger = new Logger(GameLauncherService.name);

  constructor(
    @Inject(forwardRef(() => GamesService)) private gamesService: GamesService,
    private gameServersService: GameServersService,
    private serverConfiguratorService: ServerConfiguratorService,
  ) {}

  /**
   * Launches the given game.
   *
   * @param {string} gameId The id of the game to be launched.
   * @memberof GameLauncherService
   */
  async launch(gameId: string): Promise<Game> {
    let game = await this.gamesService.getById(gameId);

    if ([GameState.ended, GameState.interrupted].includes(game.state)) {
      this.logger.warn(
        `trying to launch game #${game.number} that has already been ended`,
      );
    }

    try {
      // step 1: obtain a free server
      const gameServer = await this.gameServersService.assignFreeGameServer(
        game.id,
      );
      this.logger.verbose(
        `using server ${gameServer.name} for game #${game.number}`,
      );

      // step 2: generate logsecret
      const logSecret = generateLogsecret();
      game = await this.gamesService.update(game.id, { logSecret });

      // step 3: configure server
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

      this.logger.verbose(`game #${game.number} initialized`);
      return game;
    } catch (error) {
      this.logger.error(`Error launching game #${game.number}: ${error}`);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE) // every minute
  async launchOrphanedGames() {
    const orphanedGames = await this.gamesService.getOrphanedGames();
    for (const game of orphanedGames) {
      this.logger.verbose(`launching game #${game.number}...`);
      this.launch(game.id);
    }
  }
}
