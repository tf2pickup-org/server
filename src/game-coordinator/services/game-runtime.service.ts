import {
  Injectable,
  Logger,
  Inject,
  forwardRef,
  OnModuleInit,
} from '@nestjs/common';
import { ServerConfiguratorService } from './server-configurator.service';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { PlayersService } from '@/players/services/players.service';
import { addGamePlayer, delGamePlayer, say } from '../utils/rcon-commands';
import { Rcon } from 'rcon-client/lib';
import { Events } from '@/events/events';
import { GamesService } from '@/games/services/games.service';
import { Types } from 'mongoose';

@Injectable()
export class GameRuntimeService implements OnModuleInit {
  private logger = new Logger(GameRuntimeService.name);

  constructor(
    private gamesService: GamesService,
    private gameServersService: GameServersService,
    private serverConfiguratorService: ServerConfiguratorService,
    @Inject(forwardRef(() => PlayersService))
    private playersService: PlayersService,
    private events: Events,
  ) {}

  onModuleInit() {
    this.events.substituteRequested.subscribe(
      async ({ gameId, playerId }) =>
        await this.notifySubstituteRequested(gameId, playerId),
    );
    this.events.playerReplaced.subscribe(
      async ({ gameId, replaceeId, replacementId }) =>
        await this.replacePlayer(gameId, replaceeId, replacementId),
    );
  }

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
    replacementId: string,
  ) {
    if (replaceeId === replacementId) {
      return;
    }

    const game = await this.gamesService.getById(gameId);
    if (!game.gameServer) {
      return;
    }

    const gameServer = await this.gameServersService.getById(
      game.gameServer.toString(),
    );

    const replacee = await this.playersService.getById(replaceeId);
    const replacement = await this.playersService.getById(replacementId);
    const replacementSlot = game.findPlayerSlot(replacementId);

    await this.sayChat(
      game.gameServer,
      `${replacement.name} is replacing ${replacee.name} on ${replacementSlot.gameClass}.`,
    );

    let rcon: Rcon;

    try {
      rcon = await gameServer.rcon();

      const cmd = addGamePlayer(
        replacement.steamId,
        replacement.name,
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

  async notifySubstituteRequested(gameId: string, playerId: string) {
    const game = await this.gamesService.getById(gameId);
    if (game.gameServer) {
      const player = await this.playersService.getById(playerId);
      await this.sayChat(
        game.gameServer,
        `Looking for replacement for ${player.name}...`,
      );
    }
  }
}
