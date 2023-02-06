import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleInit,
} from '@nestjs/common';
import { Mutex } from 'async-mutex';
import { GamesService } from '@/games/services/games.service';
import {
  GameServerProvider,
  GameServerReleaseReason,
} from '../game-server-provider';
import { Game } from '@/games/models/game';
import { NoFreeGameServerAvailableError } from '../errors/no-free-game-server-available.error';
import {
  GameServerOptionIdentifier,
  GameServerOptionWithProvider,
} from '../interfaces/game-server-option';
import { GameServerControls } from '../interfaces/game-server-controls';
import { Events } from '@/events/events';
import { filter, map } from 'rxjs';
import { GameServerDetailsWithProvider } from '../interfaces/game-server-details';
import { isUndefined } from 'lodash';
import { GameState } from '@/games/models/game-state';
import { PlayerConnectionStatus } from '@/games/models/player-connection-status';
import { GameServer } from '@/games/models/game-server';
import { GameId } from '@/games/game-id';

@Injectable()
export class GameServersService
  implements OnApplicationBootstrap, OnModuleInit
{
  private readonly logger = new Logger(GameServersService.name);
  private readonly mutex = new Mutex();
  private readonly providers: GameServerProvider[] = [];

  constructor(
    @Inject(forwardRef(() => GamesService))
    private gamesService: GamesService,
    private events: Events,
  ) {}

  onApplicationBootstrap() {
    this.logger.log(
      `providers: ${this.providers
        .map((p) => p.gameServerProviderName)
        .join(', ')}`,
    );
  }

  onModuleInit() {
    // when game ends, release the gameserver
    this.events.gameChanges
      .pipe(
        filter(
          ({ oldGame, newGame }) =>
            oldGame.isInProgress && !newGame.isInProgress(),
        ),
        map(({ newGame }) => newGame),
        filter((game) => Boolean(game.gameServer)),
      )
      .subscribe(async (game: Game) => {
        const gameServer = game.gameServer!;
        const provider = this.providerByName(gameServer.provider);
        const reason = {
          [GameState.ended]: GameServerReleaseReason.GameEnded,
          [GameState.interrupted]: GameServerReleaseReason.GameInterrupted,
        }[game.state as GameState.ended | GameState.interrupted];
        await provider.releaseGameServer({
          gameServerId: gameServer.id,
          gameId: game._id,
          reason,
        });
      });
  }

  registerProvider(provider: GameServerProvider) {
    this.providers.push(provider);
    this.providers.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  async findAllGameServerOptions(): Promise<GameServerOptionWithProvider[]> {
    const options: GameServerOptionWithProvider[] = [];
    for (const provider of this.providers) {
      options.push(
        // skipcq: JS-0032
        ...(await provider.findGameServerOptions()).map((option) => ({
          ...option,
          provider: provider.gameServerProviderName,
        })),
      );
    }
    return options;
  }

  async takeFirstFreeGameServer(
    gameId: GameId,
  ): Promise<GameServerDetailsWithProvider> {
    for (const provider of this.providers) {
      try {
        // skipcq: JS-0032
        const option = await provider.takeFirstFreeGameServer({ gameId });
        return {
          ...option,
          provider: provider.gameServerProviderName,
        };
      } catch (error) {
        continue;
      }
    }

    throw new NoFreeGameServerAvailableError();
  }

  async takeGameServer(
    gameServerId: GameServerOptionIdentifier,
    gameId: GameId,
  ): Promise<GameServerDetailsWithProvider> {
    const provider = this.providerByName(gameServerId.provider);
    const gameServer = await provider.takeGameServer({
      gameServerId: gameServerId.id,
      gameId,
    });
    return { ...gameServer, provider: provider.gameServerProviderName };
  }

  async getControls(
    gameServer: GameServerOptionIdentifier,
  ): Promise<GameServerControls> {
    const provider = this.providerByName(gameServer.provider);
    return await provider.getControls(gameServer.id);
  }

  async assignGameServer(
    gameId: GameId,
    gameServerId?: GameServerOptionIdentifier,
  ): Promise<Game> {
    return await this.mutex.runExclusive(async () => {
      let game = await this.gamesService.getById(gameId);

      if (game.gameServer) {
        // unassign old gameserver
        const gameServer = game.gameServer;
        const provider = this.providerByName(game.gameServer.provider);
        game = await this.gamesService.update(game._id, {
          $set: {
            'slots.$[].connectionStatus': PlayerConnectionStatus.offline,
            state: GameState.created,
          },
          $unset: {
            gameServer: 1,
            connectString: 1,
            stvConnectString: 1,
          },
          $inc: {
            connectInfoVersion: 1,
          },
        });
        await provider.releaseGameServer({
          gameServerId: gameServer.id,
          gameId: game._id,
          reason: GameServerReleaseReason.Manual,
        });
      }

      let gameServer: GameServerDetailsWithProvider;
      if (isUndefined(gameServerId)) {
        gameServer = await this.takeFirstFreeGameServer(gameId);
      } else {
        gameServer = await this.takeGameServer(gameServerId, gameId);
      }

      game = await this.gamesService.update(game._id, {
        $set: {
          gameServer,
        },
      });
      this.logger.log(
        `using gameserver ${(game.gameServer as GameServer).name} for game #${
          game.number
        }`,
      );

      return game;
    });
  }

  private providerByName(providerName: string): GameServerProvider {
    const provider = this.providers.find(
      (provider) => provider.gameServerProviderName === providerName,
    );
    if (!provider) {
      throw new Error(`no such provider: ${providerName}`);
    }
    return provider;
  }
}
