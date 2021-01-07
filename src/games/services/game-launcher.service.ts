import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { GamesService } from './games.service';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { ServerConfiguratorService } from './server-configurator.service';
import { Environment } from '@/environment/environment';
import { Cron } from '@nestjs/schedule';
import { Events } from '@/events/events';
import { GameState } from '../models/game-state';

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
    private environment: Environment,
    private events: Events,
  ) { }

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

    if (game.state === GameState.ended || game.state === GameState.interrupted) {
      this.logger.warn(`trying to launch game #${game.number} that has already been ended`);
    }

    const gameServer = await this.gameServersService.findFreeGameServer();
    if (gameServer) {
      this.logger.verbose(`using server ${gameServer.name} for game #${game.number}`);

      // step 1: obtain a free server
      gameServer.game = game._id;
      await gameServer.save();
      game.gameServer = gameServer._id;
      await game.save();
      this.events.gameChanges.next({ game: game.toJSON() });

      // step 2: set mumble url
      const mumbleUrl = `mumble://${this.environment.mumbleServerUrl}/${this.environment.mumbleChannelName}/${gameServer.mumbleChannelName}`;
      this.logger.verbose(`game #${game.number} mumble url: ${mumbleUrl}`);
      game.mumbleUrl = mumbleUrl;
      await game.save();
      this.events.gameChanges.next({ game: game.toJSON() });

      // step 3: configure server
      const { connectString, stvConnectString } = await this.serverConfiguratorService.configureServer(gameServer, game);
      game.connectString = connectString;
      game.stvConnectString = stvConnectString;
      await game.save();
      this.events.gameChanges.next({ game: game.toJSON() });

      this.logger.verbose(`game #${game.number} initialized`);
      return game;
    } else {
      this.logger.warn(`no free servers available at this time`);
      // the game will be launched once there are game servers available
    }
  }

  @Cron('30 * * * * *') // every minute
  async launchOrphanedGames() {
    const orphanedGames = await this.gamesService.getOrphanedGames();
    for (const game of orphanedGames) {
      this.logger.verbose(`launching game #${game.number}...`);
      this.launch(game.id);
    }
  }

}
