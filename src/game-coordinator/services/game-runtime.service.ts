import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ServerConfiguratorService } from './server-configurator.service';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { PlayersService } from '@/players/services/players.service';
import { addGamePlayer, delGamePlayer, say } from '../utils/rcon-commands';
import { Rcon } from 'rcon-client/lib';
import { Events } from '@/events/events';
import { GamesService } from '@/games/services/games.service';
import { GameServerNotAssignedError } from '../errors/game-server-not-assigned.error';
import { GameSlot } from '@/games/models/game-slot';
import { Types } from 'mongoose';

@Injectable()
export class GameRuntimeService {
  private logger = new Logger(GameRuntimeService.name);

  constructor(
    private gamesService: GamesService,
    private gameServersService: GameServersService,
    private serverConfiguratorService: ServerConfiguratorService,
    @Inject(forwardRef(() => PlayersService))
    private playersService: PlayersService,
    private events: Events,
  ) {}

  async reconfigure(gameId: string) {
    let game = await this.gamesService.getById(gameId);
    if (!game.gameServer) {
      throw new Error('this game has no server assigned');
    }

    this.logger.verbose(`game #${game.number} is being reconfigured`);

    game = await this.gamesService.update(game.id, {
      $set: { connectString: null, stvConnectString: null },
      $inc: { connectInfoVersion: 1 },
    });

    try {
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
    } catch (e) {
      this.logger.error(e.message);
    }

    return game;
  }

  async replacePlayer(
    gameId: string,
    replaceeId: string,
    replacementSlot: GameSlot,
  ) {
    const game = await this.gamesService.getById(gameId);
    if (!game.gameServer) {
      throw new GameServerNotAssignedError(gameId);
    }

    const gameServer = await this.gameServersService.getById(
      game.gameServer.toString(),
    );
    let rcon: Rcon;

    try {
      rcon = await gameServer.rcon();
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

  async sayChat(gameServerId: string | Types.ObjectId, message: string) {
    const gameServer = await this.gameServersService.getById(gameServerId);
    let rcon: Rcon;
    try {
      rcon = await gameServer.rcon();
      await rcon.send(say(message));
    } catch (e) {
      this.logger.error(e.message);
    } finally {
      await rcon?.end();
    }
  }
}
