import { Injectable, Logger } from '@nestjs/common';
import { GameServer, GameServerDocument } from '../models/game-server';
import { resolve as resolveCb } from 'dns';
import { promisify } from 'util';
import { isServerOnline } from '../utils/is-server-online';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Mutex } from 'async-mutex';
import { Game } from '@/games/models/game';
import { Events } from '@/events/events';
import { plainToClass } from 'class-transformer';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Error } from 'mongoose';

const resolve = promisify(resolveCb);

@Injectable()
export class GameServersService {
  private readonly logger = new Logger(GameServersService.name);
  private readonly mutex = new Mutex();

  constructor(
    @InjectModel(GameServer.name)
    private gameServerModel: Model<GameServerDocument>,
    private events: Events,
  ) {}

  async getAllGameServers(): Promise<GameServer[]> {
    return plainToClass(
      GameServer,
      await this.gameServerModel.find({ deleted: false }).lean().exec(),
    );
  }

  async getById(gameServerId: string): Promise<GameServer> {
    return plainToClass(
      GameServer,
      await this.gameServerModel.findById(gameServerId).orFail().lean().exec(),
    );
  }

  async addGameServer(
    params: GameServer,
    adminId?: string,
  ): Promise<GameServer> {
    if (
      /^(?!0)(?!.*\.$)((1?\d?\d|25[0-5]|2[0-4]\d)(\.|$)){4}$/.test(
        params.address,
      )
    ) {
      // raw ip address was given
      params.resolvedIpAddresses = [params.address];
    } else {
      const resolvedIpAddresses = await resolve(params.address);
      this.logger.verbose(
        `resolved addresses for ${params.address}: ${resolvedIpAddresses}`,
      );
      params.resolvedIpAddresses = resolvedIpAddresses;
    }

    if (!params.mumbleChannelName) {
      const latestServer = await this.gameServerModel
        .findOne({ mumbleChannelName: { $ne: null }, deleted: false })
        .sort({ createdAt: -1 })
        .exec();
      if (latestServer) {
        const id = parseInt(latestServer.mumbleChannelName, 10) + 1;
        params.mumbleChannelName = `${id}`;
      } else {
        params.mumbleChannelName = '1';
      }
    }

    const { id } = await this.gameServerModel.create(params);
    const gameServer = await this.getById(id);
    this.logger.log(`game server ${gameServer.name} added`);
    this.events.gameServerAdded.next({ gameServer, adminId });
    return gameServer;
  }

  async updateGameServer(
    gameServerId: string,
    update: Partial<GameServer>,
  ): Promise<GameServer> {
    return plainToClass(
      GameServer,
      await this.gameServerModel
        .findByIdAndUpdate(gameServerId, update, { new: true })
        .lean()
        .exec(),
    );
  }

  async removeGameServer(
    gameServerId: string,
    adminId?: string,
  ): Promise<GameServer> {
    const gameServer = await this.updateGameServer(gameServerId, {
      deleted: true,
    });
    this.events.gameServerRemoved.next({ gameServer, adminId });
    return gameServer;
  }

  async findFreeGameServer(): Promise<GameServer> {
    return plainToClass(
      GameServer,
      await this.gameServerModel
        .findOne({ deleted: false, isOnline: true, game: { $exists: false } })
        .orFail()
        .lean()
        .exec(),
    );
  }

  async assignFreeGameServer(game: DocumentType<Game>): Promise<GameServer> {
    return this.mutex.runExclusive(async () => {
      try {
        const gameServer = await this.updateGameServer(
          (
            await this.findFreeGameServer()
          ).id,
          { game: game._id },
        );
        game.gameServer = gameServer._id;
        await game.save();
        this.events.gameChanges.next({ game: game.toJSON() });
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
    const gameServer = plainToClass(
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

  async getGameServerByEventSource(eventSource: {
    address: string;
    port: number;
  }): Promise<GameServer> {
    return plainToClass(
      GameServer,
      await this.gameServerModel
        .findOne({
          deleted: false,
          resolvedIpAddresses: eventSource.address,
          port: `${eventSource.port}`,
        })
        .orFail()
        .lean()
        .exec(),
    );
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async checkAllServers() {
    this.logger.debug('checking all servers...');
    const allGameServers = await this.getAllGameServers();
    for (const server of allGameServers) {
      const isOnline = await isServerOnline(
        server.address,
        parseInt(server.port, 10),
      );
      await this.updateGameServer(server.id, { isOnline });
      this.logger.debug(
        `server ${server.name} is ${isOnline ? 'online' : 'offline'}`,
      );
      // TODO verify rcon password
    }
  }
}
