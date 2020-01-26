import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { GamesService } from './games.service';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { ServerConfiguratorService } from './server-configurator.service';
import { Environment } from '@/environment/environment';
import { GamesGateway } from '../gateways/games.gateway';

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
    private gamesGateway: GamesGateway,
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

    if (game.state === 'ended' || game.state === 'interrupted') {
      this.logger.warn(`trying to launch game #${game.number} that has already been ended`);
    }

    const server = await this.gameServersService.findFreeGameServer();
    if (server) {
      this.logger.verbose(`using server ${server.name} for game #${game.number}`);

      // step 1: obtain a free server
      await this.gameServersService.takeServer(server.id);
      game.gameServer = server;
      await game.save();
      this.gamesGateway.emitGameUpdated(game);

      // step 2: set mumble url
      const mumbleUrl = `mumble://${this.environment.mumbleServerUrl}/${this.environment.mumbleChannelName}/${server.mumbleChannelName}`;
      this.logger.verbose(`game #${game.number} mumble url: ${mumbleUrl}`);
      game.mumbleUrl = mumbleUrl;
      await game.save();
      this.gamesGateway.emitGameUpdated(game);

      // step 3: configure server
      const { connectString, stvConnectString } = await this.serverConfiguratorService.configureServer(server, game);
      game.connectString = connectString;
      game.stvConnectString = stvConnectString;
      await game.save();
      this.gamesGateway.emitGameUpdated(game);

      this.logger.verbose(`game #${game.number} initialized`);
      return game;
    } else {
      this.logger.warn(`no free servers available at this time`);
      //
      // todo: handle
      //
    }
  }

}
