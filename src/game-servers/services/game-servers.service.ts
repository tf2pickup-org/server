import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { Mutex } from 'async-mutex';
import { GamesService } from '@/games/services/games.service';
import { GameServerProvider } from '../game-server-provider';
import { Game } from '@/games/models/game';
import { NoFreeGameServerAvailableError } from '../errors/no-free-game-server-available.error';
import {
  GameServerOptionIdentifier,
  GameServerOptionWithProvider,
} from '../interfaces/game-server-option';
import { GameServerControls } from '../interfaces/game-server-controls';

@Injectable()
export class GameServersService implements OnApplicationBootstrap {
  private readonly logger = new Logger(GameServersService.name);
  private readonly mutex = new Mutex();
  private readonly providers: GameServerProvider[] = [];

  constructor(
    @Inject(forwardRef(() => GamesService))
    private gamesService: GamesService,
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

  async getControls(
    gameServer: GameServerOptionWithProvider,
  ): Promise<GameServerControls> {
    const provider = this.providerByName(gameServer.provider);
    return await provider.getControls(gameServer.id);
  }

  async assignGameServer(
    gameId: string,
    gameServer?: GameServerOptionIdentifier,
  ): Promise<Game> {
    return await this.mutex.runExclusive(async () => {
      let game = await this.gamesService.getById(gameId);
      if (game.gameServer) {
        const provider = this.providerByName(game.gameServer.provider);
        game = await this.gamesService.update(game.id, {
          $unset: {
            gameServer: 1,
          },
        });
        await provider.onGameServerUnassigned?.({
          gameServerId: game.gameServer.id,
          gameId: game.id,
        });
      }

      if (gameServer === undefined) {
        gameServer = await this.findFreeGameServer();
      }

      this.logger.log(
        `using gameserver ${gameServer.name} for game #${game.number}`,
      );
      game = await this.gamesService.update(game.id, {
        $set: {
          gameServer,
        },
      });
      const provider = this.providerByName(gameServer.provider);
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
