import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { GamesService } from './games.service';
import { ServerConfiguratorService } from './server-configurator.service';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { RconFactoryService } from './rcon-factory.service';
import { PlayersService } from '@/players/services/players.service';
import { addGamePlayer, delGamePlayer } from '../utils/rcon-commands';
import { GamePlayer } from '../models/game-player';
import { GamesGateway } from '../gateways/games.gateway';

@Injectable()
export class GameRuntimeService {

  private logger = new Logger(GameRuntimeService.name);

  constructor(
    @Inject(forwardRef(() => GamesService)) private gamesService: GamesService,
    private gameServersService: GameServersService,
    private serverConfiguratorService: ServerConfiguratorService,
    private rconFactoryService: RconFactoryService,
    @Inject(forwardRef(() => PlayersService)) private playersService: PlayersService,
    @Inject(forwardRef(() => GamesGateway)) private gamesGateway: GamesGateway,
  ) { }

  async reconfigure(gameId: string) {
    const game = await this.gamesService.getById(gameId);
    if (!game) {
      throw new Error('no such game');
    }

    if (!game.gameServer) {
      throw new Error('this game has no server assigned');
    }

    this.logger.verbose(`game #${game.number} is being reconfigured`);

    game.connectString = null;
    await game.save();
    this.gamesGateway.emitGameUpdated(game);

    const gameServer = await this.gameServersService.getById(game.gameServer.toString());
    const { connectString } = await this.serverConfiguratorService.configureServer(gameServer, game);

    game.connectString = connectString;
    await game.save();
    this.gamesGateway.emitGameUpdated(game);
    return game;
  }

  async forceEnd(gameId: string) {
    const game = await this.gamesService.getById(gameId);
    if (!game) {
      throw new Error('no such game');
    }

    this.logger.verbose(`game #${game.number} force ended`);

    game.state = 'interrupted';
    game.error = 'ended by admin';
    await game.save();
    this.gamesGateway.emitGameUpdated(game);

    if (game.gameServer) {
      await this.cleanupServer(game.gameServer.toString());
    }

    return game;
  }

  async replacePlayer(gameId: string, replaceeId: string, replacementSlot: GamePlayer) {
    const game = await this.gamesService.getById(gameId);
    if (!game) {
      throw new Error('no such game');
    }

    if (!game.gameServer) {
      throw new Error('this game has no server assigned');
    }

    const gameServer = await this.gameServersService.getById(game.gameServer.toString());
    const rcon = await this.rconFactoryService.createRcon(gameServer);

    const player = await this.playersService.getById(replacementSlot.playerId);
    const team = parseInt(replacementSlot.teamId, 10) + 2;

    const cmd = addGamePlayer(player.steamId, player.name, team, replacementSlot.gameClass);
    this.logger.debug(cmd);
    await rcon.send(cmd);

    const replacee = await this.playersService.getById(replaceeId);
    const cmd2 = delGamePlayer(replacee?.steamId);
    this.logger.debug(cmd2);
    await rcon.send(cmd2);
    await rcon.end();
  }

  async cleanupServer(serverId: string) {
    const gameServer = await this.gameServersService.getById(serverId);
    await this.serverConfiguratorService.cleanupServer(gameServer);
    await this.gameServersService.releaseServer(serverId);
  }

}
