import { Events } from '@/events/events';
import { GameServerOptionIdentifier } from '@/game-servers/interfaces/game-server-option';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Mutex } from 'async-mutex';
import { GameInWrongStateError } from '../errors/game-in-wrong-state.error';
import { Game } from '../models/game';
import { GamesService } from './games.service';

@Injectable()
export class GameServerAssignerService implements OnModuleInit {
  private readonly logger = new Logger(GameServerAssignerService.name);
  private readonly mutex = new Mutex();

  constructor(
    private readonly gamesService: GamesService,
    private readonly gameServersService: GameServersService,
    private readonly events: Events,
  ) {}

  onModuleInit() {
    // when a game is created, give it a gameserver
    this.events.gameCreated.subscribe(
      async ({ game }) => await this.assignGameServer(game.id),
    );
  }

  /**
   * Assign a gameserver to the given game.
   *
   * @param {string} gameId The id of the game.
   * @param {GameServerOptionIdentifier} gameServerId The ID of the game server to use.
   * @memberof GameLauncherService
   */
  async assignGameServer(
    gameId: string,
    gameServerId?: GameServerOptionIdentifier,
  ): Promise<Game> {
    return await this.mutex.runExclusive(
      async () => await this.doAssignGameServer(gameId, gameServerId),
    );
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleOrphanedGames() {
    return await this.mutex.runExclusive(async () => {
      const orphanedGames = await this.gamesService.getOrphanedGames();
      for (const game of orphanedGames) {
        this.logger.verbose(`launching game #${game.number}...`);
        await this.doAssignGameServer(game.id);
      }
    });
  }

  private async doAssignGameServer(
    gameId: string,
    gameServerId?: GameServerOptionIdentifier,
  ): Promise<Game> {
    let game = await this.gamesService.getById(gameId);

    if (!game.isInProgress()) {
      throw new GameInWrongStateError(game.id, game.state);
    }

    try {
      game = await this.gameServersService.assignGameServer(
        game.id,
        gameServerId,
      );
      this.logger.verbose(
        `using server ${game.gameServer.name} for game #${game.number}`,
      );

      return game;
    } catch (error) {
      this.logger.error(
        `failed to assign game #${game.number} a gameserver: ${error}`,
      );
    }
  }
}
