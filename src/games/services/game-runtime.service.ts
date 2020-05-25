import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { GamesService } from './games.service';
import { ServerConfiguratorService } from './server-configurator.service';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { RconFactoryService } from './rcon-factory.service';
import { PlayersService } from '@/players/services/players.service';
import { addGamePlayer, delGamePlayer, say } from '../utils/rcon-commands';
import { GamePlayer } from '../models/game-player';
import { GamesGateway } from '../gateways/games.gateway';
import { Rcon } from 'rcon-client/lib';
import { ObjectId } from 'mongodb';

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

  async reconfigure(gameId: ObjectId) {
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

    const gameServer = await this.gameServersService.getById(game.gameServer as ObjectId);
    try {
      const { connectString } = await this.serverConfiguratorService.configureServer(gameServer, game);
      game.connectString = connectString;
      await game.save();
      this.gamesGateway.emitGameUpdated(game);
    } catch (e) {
      this.logger.error(e.message);
    }

    return game;
  }

  async forceEnd(gameId: ObjectId) {
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
      await this.cleanupServer(game.gameServer as ObjectId);
    }

    return game;
  }

  async replacePlayer(gameId: ObjectId, replaceeId: ObjectId, replacementSlot: GamePlayer) {
    const game = await this.gamesService.getById(gameId);
    if (!game) {
      throw new Error('no such game');
    }

    if (!game.gameServer) {
      throw new Error('this game has no server assigned');
    }

    const gameServer = await this.gameServersService.getById(game.gameServer as ObjectId);
    let rcon: Rcon;

    try {
      rcon = await this.rconFactoryService.createRcon(gameServer);
      const player = await this.playersService.getById(replacementSlot.player as ObjectId);
      const team = parseInt(replacementSlot.teamId, 10) + 2;

      const cmd = addGamePlayer(player.steamId, player.name, team, replacementSlot.gameClass);
      this.logger.debug(cmd);
      await rcon.send(cmd);

      const replacee = await this.playersService.getById(replaceeId);
      const cmd2 = delGamePlayer(replacee?.steamId);
      this.logger.debug(cmd2);
      await rcon.send(cmd2);
    } catch (e) {
      this.logger.error(`Error replacing the player on the game server: ${e.message}`);
    } finally {
      await rcon?.end();
    }
  }

  async cleanupServer(serverId: ObjectId) {
    const gameServer = await this.gameServersService.getById(serverId);

    try {
      await this.serverConfiguratorService.cleanupServer(gameServer);
    } catch (e) {
      this.logger.error(e.message);
    }

    await this.gameServersService.releaseServer(serverId);
  }

  async sayChat(gameServerId: ObjectId, message: string) {
    const gameServer = await this.gameServersService.getById(gameServerId);
    if (!gameServer) {
      throw new Error('game server does not exist');
    }

    let rcon: Rcon;
    try {
      rcon = await this.rconFactoryService.createRcon(gameServer);
      await rcon.send(say(message));
    } catch (e) {
      this.logger.error(e.message);
    } finally {
      await rcon?.end();
    }
  }

}
