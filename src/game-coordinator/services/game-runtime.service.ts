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
import { GameServerOptionWithProvider } from '@/game-servers/interfaces/game-server-option';
import { assertIsError } from '@/utils/assert-is-error';
import { GameId } from '@/games/types/game-id';
import { PlayerId } from '@/players/types/player-id';

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
    this.events.gameReconfigureRequested.subscribe(async ({ gameId }) => {
      try {
        await this.reconfigure(gameId);
      } catch (error) {
        this.logger.error(error);
      }
    });
  }

  async reconfigure(gameId: GameId) {
    let game = await this.gamesService.getById(gameId);
    if (!game.gameServer) {
      throw new Error('this game has no server assigned');
    }

    this.logger.verbose(`game #${game.number} is being reconfigured`);

    game = await this.gamesService.update(game._id, {
      $set: { connectString: null, stvConnectString: null },
      $inc: { connectInfoVersion: 1 },
    });

    try {
      const { connectString, stvConnectString } =
        await this.serverConfiguratorService.configureServer(game._id);
      game = await this.gamesService.update(game._id, {
        $set: {
          connectString,
          stvConnectString,
        },
        $inc: {
          connectInfoVersion: 1,
        },
      });
    } catch (e) {
      assertIsError(e);
      this.logger.error(e.message);
    }

    return game;
  }

  async replacePlayer(
    gameId: GameId,
    replaceeId: PlayerId,
    replacementId: PlayerId,
  ) {
    if (replaceeId.equals(replacementId)) {
      return;
    }

    const game = await this.gamesService.getById(gameId);
    if (!game.gameServer) {
      return;
    }

    const replacee = await this.playersService.getById(replaceeId);
    const replacement = await this.playersService.getById(replacementId);
    const replacementSlot = game.findPlayerSlot(replacementId);

    if (!replacementSlot) {
      throw new Error(`no slot for playerId=${replacementId.toString()}`);
    }

    await this.sayChat(
      game.gameServer,
      `${replacement.name} is replacing ${replacee.name} on ${replacementSlot.gameClass}.`,
    );

    const controls = await this.gameServersService.getControls(game.gameServer);
    let rcon: Rcon | undefined;

    try {
      rcon = await controls.rcon();

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
      assertIsError(e);
      this.logger.error(
        `Error replacing the player on the game server: ${e.message}`,
      );
    } finally {
      await rcon?.end();
    }
  }

  async sayChat(gameServer: GameServerOptionWithProvider, message: string) {
    const controls = await this.gameServersService.getControls(gameServer);
    let rcon: Rcon | undefined;
    try {
      rcon = await controls.rcon();
      await rcon.send(say(message));
    } catch (e) {
      assertIsError(e);
      this.logger.error(e.message);
    } finally {
      await rcon?.end();
    }
  }

  async notifySubstituteRequested(gameId: GameId, playerId: PlayerId) {
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
