import { Environment } from '@/environment/environment';
import { Events } from '@/events/events';
import { instantiateGameServer } from '@/game-servers/instantiate-game-server';
import { GameServerProvider } from '@/game-servers/models/game-server-provider';
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
export class StaticGameServersService implements OnModuleInit {
  private readonly logger = new Logger(StaticGameServersService.name);

  constructor(
    @InjectModel(StaticGameServer.name)
    private staticGameServerModel: Model<StaticGameServerDocument>,
    private events: Events,
    private environment: Environment,
  ) {
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
  }

  async onModuleInit() {
    await this.removeDeadGameServers();
  }

  async getById(
    gameServerId: string | Types.ObjectId,
  ): Promise<StaticGameServer> {
    const plain = await this.staticGameServerModel
      .findById(gameServerId)
      .orFail()
      .lean()
      .exec();
    return instantiateGameServer(plain);
  }

  async getAllGameServers(): Promise<StaticGameServer[]> {
    return plainToInstance(
      StaticGameServer,
      await this.staticGameServerModel
        .find({ provider: GameServerProvider.static, isOnline: true })
        .lean()
        .exec(),
    );
  }

  async updateGameServer(
    gameServerId: string | Types.ObjectId,
    update: UpdateQuery<StaticGameServer>,
  ): Promise<StaticGameServer> {
    const oldGameServer = await this.getById(gameServerId);
    const newGameServer = instantiateGameServer(
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
          provider: GameServerProvider.static,
          isOnline: true,
          isClean: true,
          game: { $exists: false },
        })
        .sort({ priority: -1 })
        .lean()
        .exec(),
    );
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
            provider: GameServerProvider.static,
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

  async getDeadGameServers(): Promise<StaticGameServer[]> {
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

    return plainToInstance(
      StaticGameServer,
      await this.staticGameServerModel
        .find({
          provider: GameServerProvider.static,
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
}
