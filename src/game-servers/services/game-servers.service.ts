import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
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
import { filter, map, Subject, takeUntil } from 'rxjs';
import { GameServerDetailsWithProvider } from '../interfaces/game-server-details';

@Injectable()
export class GameServersService implements OnApplicationBootstrap {
  private readonly logger = new Logger(GameServersService.name);
  private readonly mutex = new Mutex();
  private readonly providers: GameServerProvider[] = [];
  private readonly gameEnds = this.events.gameChanges.pipe(
    filter(
      ({ oldGame, newGame }) => oldGame.isInProgress && !newGame.isInProgress(),
    ),
    map(({ newGame }) => newGame.id),
  );
  private readonly gameServerUnassigned = new Subject<string>();

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

  registerProvider(provider: GameServerProvider) {
    this.providers.push(provider);
    this.providers.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  async findAllGameServerOptions(): Promise<GameServerOptionWithProvider[]> {
    const options: GameServerOptionWithProvider[] = [];
    for (const provider of this.providers) {
      options.push(
        ...(await provider.findGameServerOptions()).map((option) => ({
          ...option,
          provider: provider.gameServerProviderName,
        })),
      );
    }
    return options;
  }

  async takeFirstFreeGameServer(
    gameId: string,
  ): Promise<GameServerDetailsWithProvider> {
    for (const provider of this.providers) {
      try {
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
    gameId: string,
  ): Promise<GameServerDetailsWithProvider> {
    const provider = this.providerByName(gameServerId.provider);
    const gameServer = await provider.takeGameServer({
      gameServerId: gameServerId.id,
      gameId,
    });
    return { ...gameServer, provider: provider.gameServerProviderName };
  }

  async getControls(
    gameServer: GameServerOptionWithProvider,
  ): Promise<GameServerControls> {
    const provider = this.providerByName(gameServer.provider);
    return await provider.getControls(gameServer.id);
  }

  async assignGameServer(
    gameId: string,
    gameServerId?: GameServerOptionIdentifier,
  ): Promise<Game> {
    return await this.mutex.runExclusive(async () => {
      let game = await this.gamesService.getById(gameId);

      if (game.gameServer) {
        // unassign old gameserver
        const gameServer = game.gameServer;
        const provider = this.providerByName(game.gameServer.provider);
        game = await this.gamesService.update(game.id, {
          $unset: {
            gameServer: 1,
          },
        });
        await provider.releaseGameServer({
          gameServerId: gameServer.id,
          gameId: game.id,
          reason: GameServerReleaseReason.Manual,
        });
      }

      let gameServer: GameServerDetailsWithProvider;
      if (gameServerId === undefined) {
        gameServer = await this.takeFirstFreeGameServer(gameId);
      } else {
        gameServer = await this.takeGameServer(gameServerId, gameId);
      }

      game = await this.gamesService.update(game.id, {
        $set: {
          gameServer,
        },
      });
      this.logger.log(
        `using gameserver ${game.gameServer.name} for game #${game.number}`,
      );
      const provider = this.providerByName(gameServer.provider);

      this.gameEnds
        .pipe(
          filter((gameId) => gameId === game.id),
          takeUntil(
            this.gameServerUnassigned.pipe(
              filter((gameId) => gameId === game.id),
            ),
          ),
        )
        .subscribe(async (gameId) => {
          provider.releaseGameServer({
            gameServerId: gameServer.id,
            gameId,
            reason: GameServerReleaseReason.GameEnded,
          });
        });

      return game;
    });
  }

  private providerByName(providerName: string): GameServerProvider {
    return this.providers.find(
      (provider) => provider.gameServerProviderName === providerName,
    );
  }
}
