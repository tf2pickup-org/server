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
import { GameHasAlreadyEndedError } from '../errors/game-has-already-ended.error';

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
    this.events.gameReconfigureRequested.subscribe(
      async ({ gameId }) => await this.reconfigure(gameId),
    );
    this.events.gameServerReassignRequested.subscribe(
      async ({ gameId, provider, gameServerId }) =>
        await this.reassign(gameId, provider, gameServerId),
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

  async reassign(gameId: string, provider: string, gameServerId: string) {
    let game = await this.gamesService.getById(gameId);
    if (!game.isInProgress()) {
      throw new GameHasAlreadyEndedError(gameId);
    }

    try {
      game = await this.gameServersService.assignGameServer(game.id);
      this.logger.verbose(
        `using server ${game.gameServer.name} for game #${game.number}`,
      );

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
      this.logger.error(`failed to reassign game #${game.number}: ${error}`);
    }
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

    const replacee = await this.playersService.getById(replaceeId);
    const replacement = await this.playersService.getById(replacementId);
    const replacementSlot = game.findPlayerSlot(replacementId);

    await this.sayChat(
      game.gameServer,
      `${replacement.name} is replacing ${replacee.name} on ${replacementSlot.gameClass}.`,
    );

    const controls = await this.gameServersService.getControls(game.gameServer);
    let rcon: Rcon;

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
      this.logger.error(
        `Error replacing the player on the game server: ${e.message}`,
      );
    } finally {
      await rcon?.end();
    }
  }

  async sayChat(gameServer: GameServerOptionWithProvider, message: string) {
    const controls = await this.gameServersService.getControls(gameServer);
    let rcon: Rcon;
    try {
      rcon = await controls.rcon();
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
