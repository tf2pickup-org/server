import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { GameServer, GameServerDocument } from '../models/game-server';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Mutex } from 'async-mutex';
import { Events } from '@/events/events';
import { plainToInstance } from 'class-transformer';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Error, Types } from 'mongoose';
import { GamesService } from '@/games/services/games.service';
import { filter } from 'rxjs/operators';

interface HeartbeatParams {
  name: string;
  address: string;
  port: string;
  rconPassword: string;
  voiceChannelName?: string;
  internalIpAddress: string;
  priority?: number;
}

@Injectable()
export class GameServersService implements OnModuleInit {
  private readonly logger = new Logger(GameServersService.name);
  private readonly mutex = new Mutex();

  constructor(
    @InjectModel(GameServer.name)
    private gameServerModel: Model<GameServerDocument>,
    private events: Events,
    @Inject(forwardRef(() => GamesService))
    private gamesService: GamesService,
  ) {
    this.events.gameServerAdded.subscribe(({ gameServer }) => {
      this.logger.log(
        `game server ${gameServer.name} (${gameServer.address}:${gameServer.port}) added`,
      );
    });

    this.events.gameServerUpdated
      .pipe(
        filter(
          ({ oldGameServer, newGameServer }) =>
            oldGameServer.isOnline === false && newGameServer.isOnline === true,
        ),
      )
      .subscribe(({ newGameServer }) => {
        this.logger.log(
          `game server ${newGameServer.name} (${newGameServer.address}:${newGameServer.port}) is back online`,
        );
      });

    this.events.gameServerUpdated
      .pipe(
        filter(
          ({ oldGameServer, newGameServer }) =>
            oldGameServer.isOnline === true && newGameServer.isOnline === false,
        ),
      )
      .subscribe(({ newGameServer }) => {
        this.logger.log(
          `game server ${newGameServer.name} (${newGameServer.address}:${newGameServer.port}) is offline`,
        );
      });
  }

  async onModuleInit() {
    await this.removeDeadGameServers();
  }

  async getAllGameServers(): Promise<GameServer[]> {
    return plainToInstance(
      GameServer,
      await this.gameServerModel.find({ isOnline: true }).lean().exec(),
    );
  }

  async getById(gameServerId: string | Types.ObjectId): Promise<GameServer> {
    return plainToInstance(
      GameServer,
      await this.gameServerModel.findById(gameServerId).orFail().lean().exec(),
    );
  }

  async heartbeat(params: HeartbeatParams): Promise<GameServer> {
    const oldGameServer = plainToInstance(
      GameServer,
      await this.gameServerModel
        .findOne({
          address: params.address,
          port: params.port,
        })
        .lean()
        .exec(),
    );
    const newGameServer = plainToInstance(
      GameServer,
      await this.gameServerModel
        .findOneAndUpdate(
          {
            address: params.address,
            port: params.port,
          },
          {
            name: params.name,
            rconPassword: params.rconPassword,
            voiceChannelName: params.voiceChannelName,
            internalIpAddress: params.internalIpAddress,
            isOnline: true,
            lastHeartbeatAt: new Date(),
            priority: params.priority,
          },
          { upsert: true, new: true },
        )
        .lean()
        .exec(),
    );

    if (!oldGameServer) {
      this.events.gameServerAdded.next({ gameServer: newGameServer });
    } else {
      this.events.gameServerUpdated.next({ oldGameServer, newGameServer });
    }

    return newGameServer;
  }

  async updateGameServer(
    gameServerId: string,
    update: Partial<GameServer>,
  ): Promise<GameServer> {
    const oldGameServer = await this.getById(gameServerId);
    const newGameServer = plainToInstance(
      GameServer,
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

  async markAsOffline(gameServerId: string): Promise<GameServer> {
    return this.updateGameServer(gameServerId, {
      isOnline: false,
    });
  }

  async findFreeGameServer(): Promise<GameServer> {
    return plainToInstance(
      GameServer,
      await this.gameServerModel
        .findOne(
          { isOnline: true, game: { $exists: false } },
          {},
          { sort: { priority: -1 } },
        )
        .orFail()
        .lean()
        .exec(),
    );
  }

  async assignFreeGameServer(gameId: string): Promise<GameServer> {
    return this.mutex.runExclusive(async () => {
      try {
        const game = await this.gamesService.getById(gameId);
        const gameServer = await this.updateGameServer(
          (
            await this.findFreeGameServer()
          ).id,
          { game: game._id },
        );
        await this.gamesService.update(game.id, {
          gameServer: gameServer._id,
        });
        return gameServer;
      } catch (error) {
        if (error instanceof Error.DocumentNotFoundError) {
          throw new Error('no free game server available');
        } else {
          throw error;
        }
      }
    });
  }

  async releaseServer(gameServerId: string): Promise<GameServer> {
    const gameServer = plainToInstance(
      GameServer,
      await this.gameServerModel
        .findByIdAndUpdate(gameServerId, { $unset: { game: 1 } }, { new: true })
        .orFail()
        .lean()
        .exec(),
    );

    this.logger.debug(
      `game server ${gameServerId} (${gameServer.name}) marked as free`,
    );
    return gameServer;
  }

  async getDeadGameServers(): Promise<GameServer[]> {
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

    return plainToInstance(
      GameServer,
      await this.gameServerModel
        .find({
          isOnline: true,
          lastHeartbeatAt: {
            $lt: fiveMinutesAgo,
          },
        })
        .lean()
        .exec(),
    );
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async removeDeadGameServers() {
    const deadGameServers = await this.getDeadGameServers();
    await Promise.all(
      deadGameServers.map((gameServer) => this.markAsOffline(gameServer.id)),
    );
  }
}
