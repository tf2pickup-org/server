import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from 'nestjs-typegoose';
import { GameServer } from '../models/game-server';
import { ReturnModelType, DocumentType } from '@typegoose/typegoose';
import { resolve as resolveCb } from 'dns';
import { promisify } from 'util';
import { isServerOnline } from '../utils/is-server-online';
import { Cron } from '@nestjs/schedule';
import { ObjectId } from 'mongodb';

const resolve = promisify(resolveCb);

@Injectable()
export class GameServersService {

  private readonly logger = new Logger(GameServersService.name);

  constructor(
    @InjectModel(GameServer) private gameServerModel: ReturnModelType<typeof GameServer>,
  ) { }

  async getAllGameServers() {
    return await this.gameServerModel.find();
  }

  async getById(gameServerId: string) {
    return await this.gameServerModel.findById(gameServerId);
  }

  async addGameServer(gameServer: GameServer): Promise<DocumentType<GameServer>> {
    const resolvedIpAddresses = await resolve(gameServer.address);
    this.logger.verbose(`resolved addresses for ${gameServer.address}: ${resolvedIpAddresses}`);
    gameServer.resolvedIpAddresses = resolvedIpAddresses;

    if (!gameServer.mumbleChannelName) {
      const latestServer = await this.gameServerModel.findOne({ mumbleChannelName: { $ne: null } }).sort({ createdAt: -1 }).exec();
      if (latestServer) {
        const id = parseInt(latestServer.mumbleChannelName, 10) + 1;
        gameServer.mumbleChannelName = `${id}`;
      } else {
        gameServer.mumbleChannelName = '1';
      }
    }

    const { game, ...tmp } = gameServer; // extract game
    const ret = await this.gameServerModel.create(tmp);
    this.logger.log(`game server ${ret.id} (${ret.name}) added`);
    return ret;
  }

  async removeGameServer(gameServerId: string) {
    const { ok } = await this.gameServerModel.deleteOne({ _id: gameServerId });
    if (!ok) {
      throw new Error('unable to remove game server');
    } else {
      this.logger.log(`game server ${gameServerId} removed`);
    }
  }

  async findFreeGameServer(): Promise<DocumentType<GameServer>> {
    return await this.gameServerModel.findOne({ isOnline: true, game: { $exists: false } });
  }

  async releaseServer(gameServerId: string): Promise<DocumentType<GameServer>>  {
    const gameServer = await this.gameServerModel.findByIdAndUpdate(gameServerId, { $unset: { game: 1 } }, { new: true });
    if (gameServer) {
      this.logger.debug(`game server ${gameServerId} (${gameServer.name}) marked as free`);
      return gameServer;
    } else {
      throw new Error('no such game server');
    }
  }

  async getGameServerByEventSource(eventSource: { address: string; port: number; }): Promise<DocumentType<GameServer>> {
    return await this.gameServerModel.findOne({
      resolvedIpAddresses: eventSource.address,
      port: `${eventSource.port}`,
    });
  }

  @Cron('0 * * * * *') // every minute
  async checkAllServers() {
    this.logger.debug('checking all servers...');
    const allGameServers = await this.getAllGameServers();
    for (const server of allGameServers) {
      const isOnline = await isServerOnline(server.address, parseInt(server.port, 10));
      server.isOnline = isOnline;
      this.logger.debug(`server ${server.name} is ${isOnline ? 'online' : 'offline'}`);
      // todo verify rcon password
      await server.save();
    }
  }

}
