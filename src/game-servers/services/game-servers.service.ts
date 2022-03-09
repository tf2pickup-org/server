import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { Mutex } from 'async-mutex';
import { Events } from '@/events/events';
import { GamesService } from '@/games/services/games.service';
import { GameServer, GameServerDocument } from '../models/game-server';
import { InjectModel } from '@nestjs/mongoose';
import { LeanDocument, Model, Types, UpdateQuery } from 'mongoose';
import { concatMap, filter, groupBy, take } from 'rxjs';
import { plainToInstance } from 'class-transformer';
import { GameServerProvider } from '../game-server-provider';
import { Game } from '@/games/models/game';
import { NoFreeGameServerAvailableError } from '../errors/no-free-game-server-available.error';

type GameServerConstructor = GameServerProvider['implementingClass'];

@Injectable()
export class GameServersService implements OnModuleInit {
  private readonly logger = new Logger(GameServersService.name);
  private readonly mutex = new Mutex();
  private readonly providers: GameServerProvider[] = [];
  private readonly discriminators: Map<string, GameServerConstructor> =
    new Map();

  constructor(
    @InjectModel(GameServer.name)
    private gameServerModel: Model<GameServerDocument>,
    private events: Events,
    @Inject(forwardRef(() => GamesService))
    private gamesService: GamesService,
  ) {}

  onModuleInit() {
    this.events.gameChanges
      .pipe(
        groupBy(({ game }) => game.id),
        concatMap((group) =>
          group.pipe(
            filter(({ game }) => !game.isInProgress()),
            take(1),
          ),
        ),
      )
      .subscribe(async ({ game }) => await this.maybeReleaseGameServer(game));
  }

  registerProvider(provider: GameServerProvider) {
    this.providers.push(provider);
    this.discriminators.set(
      provider.gameServerProviderName,
      provider.implementingClass,
    );
  }

  async getById(gameServerId: string | Types.ObjectId): Promise<GameServer> {
    const plain = await this.gameServerModel
      .findById(gameServerId)
      .orFail()
      .lean()
      .exec();
    return this.instantiateGameServer(plain);
  }

  async updateGameServer(
    gameServerId: string | Types.ObjectId,
    update: UpdateQuery<GameServer>,
  ): Promise<GameServer> {
    const oldGameServer = await this.getById(gameServerId);
    const newGameServer = this.instantiateGameServer(
      await this.gameServerModel
        .findByIdAndUpdate(gameServerId, update, { new: true })
        .lean()
        .exec(),
    );
    this.events.gameServerUpdated.next({
      oldGameServer,
      newGameServer,
    });
    return newGameServer;
  }

  async findFreeGameServer(): Promise<GameServer> {
    for (const provider of this.providers) {
      try {
        return await provider.findFirstFreeGameServer();
      } catch (error) {
        continue;
      }
    }

    throw new NoFreeGameServerAvailableError();
  }

  async assignGameServer(gameId: string): Promise<GameServer> {
    return this.mutex.runExclusive(async () => {
      const game = await this.gamesService.getById(gameId);
      let gameServer = await this.findFreeGameServer();
      this.logger.log(
        `Using gameserver ${gameServer.name} for game #${game.number}`,
      );
      gameServer = await this.updateGameServer(gameServer.id, {
        game: game._id,
      });
      await this.gamesService.update(game.id, { gameServer: gameServer._id });
      return gameServer;
    });
  }

  async maybeReleaseGameServer(game: Game): Promise<void> {
    if (!game.gameServer) {
      return;
    }

    const gameServer = await this.getById(game.gameServer);
    if (gameServer.game?.toString() === game.id) {
      await this.updateGameServer(gameServer.id, {
        $unset: {
          game: 1,
        },
      });
    }
  }

  private instantiateGameServer(plain: LeanDocument<GameServerDocument>) {
    const cls = this.discriminators.get(plain.provider);
    if (cls) {
      return plainToInstance(cls, plain);
    } else {
      return plainToInstance(GameServer, plain);
    }
  }
}
