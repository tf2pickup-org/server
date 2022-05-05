import { Environment } from '@/environment/environment';
import { Events } from '@/events/events';
import { NoFreeGameServerAvailableError } from '@/game-servers/errors/no-free-game-server-available.error';
import { GameServerProvider } from '@/game-servers/game-server-provider';
import { GameServer } from '@/game-servers/models/game-server';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import {
  logAddressDel,
  delAllGamePlayers,
  disablePlayerWhitelist,
} from '@/games/utils/rcon-commands';
import { serverCleanupDelay } from '@configs/game-servers';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { plainToInstance } from 'class-transformer';
import { Model, Types, UpdateQuery } from 'mongoose';
import { Rcon } from 'rcon-client/lib';
import { delay, filter } from 'rxjs/operators';
import {
  isStaticGameServer,
  StaticGameServer,
  StaticGameServerDocument,
} from '../models/static-game-server';
import { staticGameServerProviderName } from '../static-game-server-provider-name';

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
  readonly implementingClass = StaticGameServer;
  readonly priority = Number.MAX_SAFE_INTEGER;
  private readonly logger = new Logger(StaticGameServersService.name);

  constructor(
    @InjectModel(StaticGameServer.name)
    private staticGameServerModel: Model<StaticGameServerDocument>,
    private events: Events,
    private environment: Environment,
    private gameServersService: GameServersService,
  ) {}

  async onModuleInit() {
    this.installLoggers();

    // mark the server as dirty when it's taken
    this.events.gameServerUpdated
      .pipe(
        filter(({ newGameServer }) => isStaticGameServer(newGameServer)),
        filter(
          ({ oldGameServer, newGameServer }) =>
            !oldGameServer.game && !!newGameServer.game,
        ),
      )
      .subscribe(({ newGameServer }) => this.markAsDirty(newGameServer.id));

    // cleanup the server when it's released
    this.events.gameServerUpdated
      .pipe(
        filter(({ newGameServer }) => isStaticGameServer(newGameServer)),
        filter(
          ({ oldGameServer, newGameServer }) =>
            !!oldGameServer.game && !newGameServer.game,
        ),
        delay(serverCleanupDelay),
      )
      .subscribe(({ newGameServer }) => this.cleanupServer(newGameServer.id));

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
    const oldGameServer = await this.getById(gameServerId);
    const newGameServer = plainToInstance(
      StaticGameServer,
      await this.staticGameServerModel
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

  async getCleanGameServers(): Promise<StaticGameServer[]> {
    return plainToInstance(
      StaticGameServer,
      await this.staticGameServerModel
        .find({
          isOnline: true,
          isClean: true,
          game: { $exists: false },
        })
        .sort({ priority: -1 })
        .lean()
        .exec(),
    );
  }

  async findFirstFreeGameServer(): Promise<GameServer> {
    const gameServers = await this.getCleanGameServers();
    if (gameServers.length > 0) {
      return gameServers[0];
    } else {
      throw new NoFreeGameServerAvailableError();
    }
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
      this.events.gameServerAdded.next({ gameServer: newGameServer });
    } else {
      this.events.gameServerUpdated.next({ oldGameServer, newGameServer });
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

  async markAsDirty(gameServerId: string): Promise<StaticGameServer> {
    return await this.updateGameServer(gameServerId, { isClean: false });
  }

  async cleanupServer(gameServerId: string) {
    const gameServer = await this.getById(gameServerId);
    let rcon: Rcon;
    try {
      rcon = await gameServer.rcon();

      const logAddress = `${this.environment.logRelayAddress}:${this.environment.logRelayPort}`;
      this.logger.debug(
        `[${gameServer.name}] removing log address ${logAddress}...`,
      );
      await rcon.send(logAddressDel(logAddress));
      await rcon.send(delAllGamePlayers());
      await rcon.send(disablePlayerWhitelist());
      await this.updateGameServer(gameServerId, { isClean: true });
      this.logger.verbose(`[${gameServer.name}] server cleaned up`);
    } catch (error) {
      throw new Error(
        `could not cleanup server ${gameServer.name} (${error.message})`,
      );
    } finally {
      await rcon?.end();
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async removeDeadGameServers() {
    const deadGameServers = await this.getDeadGameServers();
    await Promise.all(
      deadGameServers.map((gameServer) => this.markAsOffline(gameServer.id)),
    );
  }

  private installLoggers() {
    this.events.gameServerAdded
      .pipe(filter(({ gameServer }) => isStaticGameServer(gameServer)))
      .subscribe(({ gameServer }) => {
        this.logger.log(
          `game server ${gameServer.name} (${gameServer.address}:${gameServer.port}) added`,
        );
      });

    // log when a server is back online
    this.events.gameServerUpdated
      .pipe(
        filter(({ newGameServer }) => isStaticGameServer(newGameServer)),
        filter(
          ({ oldGameServer, newGameServer }) =>
            (oldGameServer as StaticGameServer).isOnline === false &&
            (newGameServer as StaticGameServer).isOnline === true,
        ),
      )
      .subscribe(({ newGameServer }) => {
        this.logger.log(
          `game server ${newGameServer.name} (${newGameServer.address}:${newGameServer.port}) is back online`,
        );
      });

    // log when a server is offline
    this.events.gameServerUpdated
      .pipe(
        filter(({ newGameServer }) => isStaticGameServer(newGameServer)),
        filter(
          ({ oldGameServer, newGameServer }) =>
            (oldGameServer as StaticGameServer).isOnline === true &&
            (newGameServer as StaticGameServer).isOnline === false,
        ),
      )
      .subscribe(({ newGameServer }) => {
        this.logger.log(
          `game server ${newGameServer.name} (${newGameServer.address}:${newGameServer.port}) is offline`,
        );
      });
  }
}
