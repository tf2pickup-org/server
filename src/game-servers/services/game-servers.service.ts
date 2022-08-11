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
import { GameServerOptionWithProvider } from '../interfaces/game-server-option';
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
    return provider.getControls(gameServer.id);
  }

  async assignGameServer(gameId: string): Promise<Game> {
    return this.mutex.runExclusive(async () => {
      const game = await this.gamesService.getById(gameId);
      const gameServer = await this.findFreeGameServer();
      this.logger.log(
        `using gameserver ${gameServer.name} for game #${game.number}`,
      );
      await this.gamesService.update(game.id, {
        gameServer,
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
