import { NoFreeGameServerAvailableError } from '@/game-servers/errors/no-free-game-server-available.error';
import { GameServerProvider } from '@/game-servers/game-server-provider';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Mutex } from 'async-mutex';
import { plainToInstance } from 'class-transformer';
import { Model, Types, UpdateQuery } from 'mongoose';
import { delay, filter, take } from 'rxjs/operators';
import {
  StaticGameServer,
  StaticGameServerDocument,
} from '../models/static-game-server';
import { staticGameServerProviderName } from '../static-game-server-provider-name';
import { GameServerControls } from '@/game-servers/interfaces/game-server-controls';
import { StaticGameServerControls } from '../static-game-server-controls';
import { Subject } from 'rxjs';
import { GameServerOption } from '@/game-servers/interfaces/game-server-option';
import { serverCleanupDelay } from '@configs/game-servers';
import { Events } from '@/events/events';

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
export class StaticGameServersService
  implements GameServerProvider, OnModuleInit
{
  readonly gameServerProviderName = staticGameServerProviderName;
  readonly priority = Number.MAX_SAFE_INTEGER;

  // events
  readonly gameServerAdded = new Subject<StaticGameServer>();
  readonly gameServerUpdated = new Subject<{
    oldGameServer: StaticGameServer;
    newGameServer: StaticGameServer;
  }>();

  private readonly logger = new Logger(StaticGameServersService.name);
  private readonly mutex = new Mutex();

  constructor(
    @InjectModel(StaticGameServer.name)
    private readonly staticGameServerModel: Model<StaticGameServerDocument>,
    private readonly events: Events,
    private readonly gameServersService: GameServersService,
  ) {}

  async onModuleInit() {
    this.installLoggers();
    await this.removeDeadGameServers();
    this.gameServersService.registerProvider(this);
  }

  async getById(
    gameServerId: string | Types.ObjectId,
  ): Promise<StaticGameServer> {
    const plain = await this.staticGameServerModel
      .findById(gameServerId)
      .orFail()
      .lean()
      .exec();
    return plainToInstance(StaticGameServer, plain);
  }

  async getAllGameServers(): Promise<StaticGameServer[]> {
    return plainToInstance(
      StaticGameServer,
      await this.staticGameServerModel.find({ isOnline: true }).lean().exec(),
    );
  }

  async updateGameServer(
    gameServerId: string | Types.ObjectId,
    update: UpdateQuery<StaticGameServerDocument>,
  ): Promise<StaticGameServer> {
    return await this.mutex.runExclusive(async () => {
      const oldGameServer = await this.getById(gameServerId);
      const newGameServer = plainToInstance(
        StaticGameServer,
        await this.staticGameServerModel
          .findByIdAndUpdate(gameServerId, update, { new: true })
          .lean()
          .exec(),
      );
      this.gameServerUpdated.next({
        oldGameServer,
        newGameServer,
      });
      return newGameServer;
    });
  }

  async getFreeGameServers(): Promise<StaticGameServer[]> {
    return plainToInstance(
      StaticGameServer,
      await this.staticGameServerModel
        .find({
          isOnline: true,
          game: { $exists: false },
        })
        .sort({ priority: -1 })
        .lean()
        .exec(),
    );
  }

  async findFirstFreeGameServer(): Promise<GameServerOption> {
    const gameServers = await this.getFreeGameServers();
    if (gameServers.length > 0) {
      const selectedGameServer = gameServers[0];
      return {
        id: selectedGameServer.id,
        name: selectedGameServer.name,
        address: selectedGameServer.address,
        port: parseInt(selectedGameServer.port, 10),
      };
    } else {
      throw new NoFreeGameServerAvailableError();
    }
  }

  async getControls(id: string): Promise<GameServerControls> {
    const gameServer = await this.getById(id);
    return new StaticGameServerControls(gameServer);
  }

  async heartbeat(params: HeartbeatParams): Promise<StaticGameServer> {
    const oldGameServer = plainToInstance(
      StaticGameServer,
      await this.staticGameServerModel
        .findOne({
          address: params.address,
          port: params.port,
        })
        .lean()
        .exec(),
    );
    const newGameServer = plainToInstance(
      StaticGameServer,
      await this.staticGameServerModel
        .findOneAndUpdate(
          {
            address: params.address,
            port: params.port,
          },
          {
            name: params.name,
            rconPassword: params.rconPassword,
            customVoiceChannelName: params.voiceChannelName,
            internalIpAddress: params.internalIpAddress,
            isOnline: true,
            lastHeartbeatAt: new Date(),
            priority: params.priority,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        )
        .lean()
        .exec(),
    );

    if (!oldGameServer) {
      this.gameServerAdded.next(newGameServer);
    } else {
      this.gameServerUpdated.next({ oldGameServer, newGameServer });
    }

    return newGameServer;
  }

  async getDeadGameServers(): Promise<StaticGameServer[]> {
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

    return plainToInstance(
      StaticGameServer,
      await this.staticGameServerModel
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

  async markAsOffline(gameServerId: string): Promise<StaticGameServer> {
    return this.updateGameServer(gameServerId, { isOnline: false });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async removeDeadGameServers() {
    const deadGameServers = await this.getDeadGameServers();
    await Promise.all(
      deadGameServers.map((gameServer) => this.markAsOffline(gameServer.id)),
    );
  }

  async onGameServerAssigned({ gameServerId, gameId }) {
    await this.updateGameServer(gameServerId, { game: gameId });
    this.events.gameChanges
      .pipe(
        filter(({ newGame }) => newGame.id === gameId),
        filter(
          ({ oldGame, newGame }) =>
            oldGame.isInProgress() && !newGame.isInProgress(),
        ),
        take(1),
        delay(serverCleanupDelay),
      )
      .subscribe(async ({ newGame }) => await this.freeGameServer(newGame.id));
  }

  private async freeGameServer(gameServerId: string) {
    await this.updateGameServer(gameServerId, { $unset: { game: 1 } });
  }

  private installLoggers() {
    this.gameServerAdded.subscribe((gameServer) => {
      this.logger.log(
        `game server ${gameServer.name} (${gameServer.address}:${gameServer.port}) added`,
      );
    });

    // log when a server is back online
    this.gameServerUpdated
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

    // log when a server is offline
    this.gameServerUpdated
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
}
