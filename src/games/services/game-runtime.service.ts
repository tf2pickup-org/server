import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { GamesService } from './games.service';
import { ServerConfiguratorService } from './server-configurator.service';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { RconFactoryService } from './rcon-factory.service';
import { PlayersService } from '@/players/services/players.service';
import { addGamePlayer, delGamePlayer, say } from '../utils/rcon-commands';
import { GameSlot } from '../models/game-slot';
import { Rcon } from 'rcon-client/lib';
import { Events } from '@/events/events';
import { SlotStatus } from '../models/slot-status';
import { GameState } from '../models/game-state';

@Injectable()
export class GameRuntimeService {
  private logger = new Logger(GameRuntimeService.name);

  constructor(
    @Inject(forwardRef(() => GamesService)) private gamesService: GamesService,
    private gameServersService: GameServersService,
    private serverConfiguratorService: ServerConfiguratorService,
    private rconFactoryService: RconFactoryService,
    @Inject(forwardRef(() => PlayersService))
    private playersService: PlayersService,
    private events: Events,
  ) {}

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
    this.events.gameChanges.next({ game });

    const gameServer = await this.gameServersService.getById(
      game.gameServer.toString(),
    );
    try {
      const { connectString } =
        await this.serverConfiguratorService.configureServer(gameServer, game);
      game.connectString = connectString;
      await game.save();
      this.events.gameChanges.next({ game });
    } catch (e) {
      this.logger.error(e.message);
    }

    return game;
  }

  async forceEnd(gameId: string, adminId?: string) {
    const game = await this.gamesService.getById(gameId);
    if (!game) {
      throw new Error('no such game');
    }

    this.logger.verbose(`game #${game.number} force ended`);

    game.state = GameState.interrupted;
    game.error = 'ended by admin';
    game.slots
      .filter((s) => s.status === SlotStatus.waitingForSubstitute)
      .forEach((s) => (s.status = SlotStatus.active));
    await game.save();
    this.events.gameChanges.next({ game, adminId });
    this.events.substituteRequestsChange.next();

    if (game.gameServer) {
      await this.cleanupServer(game.gameServer.toString());
    }

    return game;
  }

  async replacePlayer(
    gameId: string,
    replaceeId: string,
    replacementSlot: GameSlot,
  ) {
    const game = await this.gamesService.getById(gameId);
    if (!game) {
      throw new Error('no such game');
    }

    if (!game.gameServer) {
      throw new Error('this game has no server assigned');
    }

    const gameServer = await this.gameServersService.getById(
      game.gameServer.toString(),
    );
    let rcon: Rcon;

    try {
      rcon = await this.rconFactoryService.createRcon(gameServer);
      const player = await this.playersService.getById(replacementSlot.player);

      const cmd = addGamePlayer(
        player.steamId,
        player.name,
        replacementSlot.team,
        replacementSlot.gameClass,
      );
      this.logger.debug(cmd);
      await rcon.send(cmd);

      const replacee = await this.playersService.getById(replaceeId);
      const cmd2 = delGamePlayer(replacee?.steamId);
      this.logger.debug(cmd2);
      await rcon.send(cmd2);
    } catch (e) {
      this.logger.error(
        `Error replacing the player on the game server: ${e.message}`,
      );
    } finally {
      await rcon?.end();
    }
  }

  async cleanupServer(serverId: string) {
    const gameServer = await this.gameServersService.getById(serverId);

    try {
      await this.serverConfiguratorService.cleanupServer(gameServer);
    } catch (e) {
      this.logger.error(e.message);
    }

    await this.gameServersService.releaseServer(serverId);
  }

  async sayChat(gameServerId: string, message: string) {
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
