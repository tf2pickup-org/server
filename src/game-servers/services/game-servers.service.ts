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
import { Error, Model, Types, UpdateQuery } from 'mongoose';
import { instantiateGameServer } from '../instantiate-game-server';
import { concatMap, distinctUntilChanged, filter, groupBy } from 'rxjs';
import { StaticGameServersService } from '../providers/static-game-server/services/static-game-servers.service';

@Injectable()
export class GameServersService implements OnModuleInit {
  private readonly logger = new Logger(GameServersService.name);
  private readonly mutex = new Mutex();

  constructor(
    private events: Events,
    @Inject(forwardRef(() => GamesService))
    private gamesService: GamesService,
    @InjectModel(GameServer.name)
    private gameServerModel: Model<GameServerDocument>,
    private staticGameServersService: StaticGameServersService,
  ) {}

  onModuleInit() {
    this.events.gameChanges
      .pipe(
        groupBy(({ game }) => game.id),
        concatMap((group) =>
          group.pipe(
            distinctUntilChanged((x, y) => x.game.state === y.game.state),
            filter(({ game }) => !game.isInProgress()),
          ),
        ),
      )
      .subscribe(({ game }) => this.releaseGameServer(game.gameServer));
  }

  async getById(gameServerId: string | Types.ObjectId): Promise<GameServer> {
    const plain = await this.gameServerModel
      .findById(gameServerId)
      .orFail()
      .lean()
      .exec();
    return instantiateGameServer(plain);
  }

  async updateGameServer<Type extends GameServer = GameServer>(
    gameServerId: string | Types.ObjectId,
    update: UpdateQuery<Type>,
  ): Promise<GameServer> {
    const oldGameServer = await this.getById(gameServerId);
    const newGameServer = instantiateGameServer(
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
    const staticGameServers =
      await this.staticGameServersService.getCleanGameServers();
    if (staticGameServers.length > 0) {
      return staticGameServers[0];
    }

    throw new Error('no free game server available');
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

  async releaseGameServer(
    gameServerId: string | Types.ObjectId,
  ): Promise<GameServer> {
    return this.updateGameServer(gameServerId, {
      $unset: {
        game: 1,
      },
    });
  }
}
