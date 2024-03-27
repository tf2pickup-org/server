import { Events } from '@/events/events';
import { GameServerOptionIdentifier } from '@/game-servers/interfaces/game-server-option';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { assertIsError } from '@/utils/assert-is-error';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Mutex } from 'async-mutex';
import { CannotAssignGameServerError } from '../errors/cannot-assign-gameserver.error';
import { GameInWrongStateError } from '../errors/game-in-wrong-state.error';
import { GameId } from '../types/game-id';
import { Game } from '../models/game';
import { GamesService } from './games.service';
import { PlayerId } from '@/players/types/player-id';
import { PlayersService } from '@/players/services/players.service';

@Injectable()
export class GameServerAssignerService implements OnModuleInit {
  private readonly logger = new Logger(GameServerAssignerService.name);
  private readonly mutex = new Mutex();

  constructor(
    private readonly gamesService: GamesService,
    private readonly gameServersService: GameServersService,
    private readonly events: Events,
    private readonly playersService: PlayersService,
  ) {}

  onModuleInit() {
    // when a game is created, give it a gameserver
    this.events.gameCreated.subscribe(async ({ game }) => {
      const bot = await this.playersService.findBot();
      try {
        await this.assignGameServer(game._id, undefined, bot._id);
      } catch (error) {
        this.logger.error(error);
      }
    });
  }

  /**
   * Assign a gameserver to the given game.
   *
   * @param {string} gameId The id of the game.
   * @param {GameServerOptionIdentifier} gameServerId The ID of the game server to use.
   * @memberof GameLauncherService
   */
  async assignGameServer(
    gameId: GameId,
    gameServerId?: GameServerOptionIdentifier,
    actorId?: PlayerId,
  ): Promise<Game> {
    return await this.mutex.runExclusive(
      async () => await this.doAssignGameServer(gameId, gameServerId, actorId),
    );
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleOrphanedGames() {
    return await this.mutex.runExclusive(async () => {
      const orphanedGames = await this.gamesService.getOrphanedGames();
      for (const game of orphanedGames) {
        this.logger.verbose(`launching game #${game.number}...`);
        // skipcq: JS-0032
        await this.doAssignGameServer(game._id);
      }
    });
  }

  private async doAssignGameServer(
    gameId: GameId,
    gameServerId?: GameServerOptionIdentifier,
    actorId?: PlayerId,
  ): Promise<Game> {
    let game = await this.gamesService.getById(gameId);
    if (!game.isInProgress()) {
      throw new GameInWrongStateError(game._id, game.state);
    }

    try {
      game = await this.gameServersService.assignGameServer(
        game._id,
        game.map,
        gameServerId,
        actorId,
      );
      this.logger.verbose(
        `using server ${game.gameServer!.name} for game #${game.number}`,
      );

      return game;
    } catch (error) {
      assertIsError(error);
      throw new CannotAssignGameServerError(game, error.message);
    }
  }
}
