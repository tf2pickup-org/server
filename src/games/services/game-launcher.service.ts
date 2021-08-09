import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { GamesService } from './games.service';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { ServerConfiguratorService } from './server-configurator.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Events } from '@/events/events';
import { GameState } from '../models/game-state';
import { generateLogsecret } from '@/game-servers/utils/generate-logsecret';

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
    private events: Events,
  ) {}

  /**
   * Launches the given game.
   *
   * @param {string} gameId The id of the game to be launched.
   * @memberof GameLauncherService
   */
  async launch(gameId: string) {
    const game = await this.gamesService.getById(gameId);
    if (!game) {
      throw new Error('no such game');
    }

    if (
      game.state === GameState.ended ||
      game.state === GameState.interrupted
    ) {
      this.logger.warn(
        `trying to launch game #${game.number} that has already been ended`,
      );
    }

    try {
      // step 1: obtain a free server
      const gameServer = await this.gameServersService.assignFreeGameServer(
        game,
      );
      this.logger.verbose(
        `using server ${gameServer.name} for game #${game.number}`,
      );

      // step 2: generate logsecret
      game.logSecret = generateLogsecret();
      await game.save();

      // step 3: configure server
      const { connectString, stvConnectString } =
        await this.serverConfiguratorService.configureServer(gameServer, game);
      game.connectString = connectString;
      game.stvConnectString = stvConnectString;
      await game.save();
      this.events.gameChanges.next({ game: game.toJSON() });

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
