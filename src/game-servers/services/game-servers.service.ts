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
  GameServerUnassignReason,
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

  async findFreeGameServer(): Promise<GameServerOptionWithProvider> {
    for (const provider of this.providers) {
      try {
        const option = await provider.findFirstFreeGameServer();
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

  async getGameServerOption(
    gameServerId: GameServerOptionIdentifier,
  ): Promise<GameServerOptionWithProvider> {
    const provider = this.providerByName(gameServerId.provider);
    const option = await provider.getGameServerOption(gameServerId.id);
    return { ...option, provider: provider.gameServerProviderName };
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
        const gameServer = game.gameServer;
        const provider = this.providerByName(game.gameServer.provider);
        game = await this.gamesService.update(game.id, {
          $unset: {
            gameServer: 1,
          },
        });
        await provider.onGameServerUnassigned?.({
          gameServerId: gameServer.id,
          gameId: game.id,
          reason: GameServerUnassignReason.Manual,
        });
      }

      let gameServer: GameServerOptionWithProvider;
      if (gameServerId === undefined) {
        gameServer = await this.findFreeGameServer();
      } else {
        gameServer = await this.getGameServerOption(gameServerId);
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
          provider.onGameServerUnassigned?.({
            gameServerId: gameServer.id,
            gameId,
            reason: GameServerUnassignReason.GameEnded,
          });
        });

      await provider.onGameServerAssigned?.({
        gameServerId: gameServer.id,
        gameId: game.id,
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
