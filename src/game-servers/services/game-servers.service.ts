import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { GameServer, GameServerDocument } from '../models/game-server';
import { isServerOnline } from '../utils/is-server-online';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Mutex } from 'async-mutex';
import { Events } from '@/events/events';
import { plainToClass } from 'class-transformer';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Error, Types } from 'mongoose';
import { GamesService } from '@/games/services/games.service';

@Injectable()
export class GameServersService {
  private readonly logger = new Logger(GameServersService.name);
  private readonly mutex = new Mutex();

  constructor(
    @InjectModel(GameServer.name)
    private gameServerModel: Model<GameServerDocument>,
    private events: Events,
    @Inject(forwardRef(() => GamesService))
    private gamesService: GamesService,
  ) {}

  async getAllGameServers(): Promise<GameServer[]> {
    return plainToClass(
      GameServer,
      await this.gameServerModel.find({ deleted: false }).lean().exec(),
    );
  }

  async getById(gameServerId: string | Types.ObjectId): Promise<GameServer> {
    return plainToClass(
      GameServer,
      await this.gameServerModel.findById(gameServerId).orFail().lean().exec(),
    );
  }

  async addGameServer(
    params: GameServer,
    adminId?: string,
  ): Promise<GameServer> {
    if (!params.voiceChannelName) {
      const latestServer = await this.gameServerModel
        .findOne({ voiceChannelName: { $ne: null }, deleted: false })
        .sort({ createdAt: -1 })
        .exec();
      if (latestServer) {
        const id = parseInt(latestServer.voiceChannelName, 10) + 1;
        params.voiceChannelName = `${id}`;
      } else {
        params.voiceChannelName = '1';
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
    adminId?: string,
  ): Promise<GameServer> {
    const oldGameServer = await this.getById(gameServerId);
    const newGameServer = plainToClass(
      GameServer,
      await this.gameServerModel
        .findByIdAndUpdate(gameServerId, update, { new: true })
        .lean()
        .exec(),
    );
    this.events.gameServerUpdated.next({
      oldGameServer,
      newGameServer,
      adminId,
    });
    return newGameServer;
  }

  async removeGameServer(
    gameServerId: string,
    adminId?: string,
  ): Promise<GameServer> {
    return this.updateGameServer(
      gameServerId,
      {
        deleted: true,
      },
      adminId,
    );
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
