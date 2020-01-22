import { Injectable, Logger } from '@nestjs/common';
import { GamesService } from './games.service';
import { PlayersService } from '@/players/services/players.service';
import { PlayerConnectionStatus } from '../models/player-connection-status';
import { ConfigService } from '@nestjs/config';
import { GameRuntimeService } from './game-runtime.service';
import { GamesGateway } from '../gateways/games.gateway';

@Injectable()
export class GameEventHandlerService {

  private logger = new Logger(GameEventHandlerService.name);
  private serverCleanupDelay = this.configService.get<number>('serverCleanupDelay');

  constructor(
    private gamesService: GamesService,
    private playersService: PlayersService,
    private configService: ConfigService,
    private gameRuntimeService: GameRuntimeService,
    private gamesGateway: GamesGateway,
  ) { }

  async onMatchStarted(gameId: string) {
    const game = await this.gamesService.getById(gameId);
    if (game) {
      game.state = 'started';
      await game.save();
    } else {
      this.logger.warn(`no such game: ${gameId}`);
    }
  }

  async onMatchEnded(gameId: string) {
    const game = await this.gamesService.getById(gameId);
    if (game) {
      game.state = 'ended';
      await game.save();
      setTimeout(() => this.gameRuntimeService.cleanupServer(game.gameServer.toString()), this.serverCleanupDelay);
    } else {
      this.logger.warn(`no such game: ${gameId}`);
    }
  }

  async onLogsUploaded(gameId: string, logsUrl: string) {
    const game = await this.gamesService.getById(gameId);
    if (game) {
      game.logsUrl = logsUrl;
      await game.save();
    } else {
      this.logger.warn(`no such game: ${gameId}`);
    }
  }

  async onPlayerJoining(gameId: string, steamId: string) {
    await this.setPlayerConnectionStatus(gameId, steamId, 'joining');
  }

  async onPlayerConnected(gameId: string, steamId: string) {
    await this.setPlayerConnectionStatus(gameId, steamId, 'connected');
  }

  async onPlayerDisconnected(gameId: string, steamId: string) {
    await this.setPlayerConnectionStatus(gameId, steamId, 'offline');
  }

  private async setPlayerConnectionStatus(gameId: string, steamId: string, connectionStatus: PlayerConnectionStatus) {
    const player = await this.playersService.findBySteamId(steamId);
    if (!player) {
      this.logger.warn(`no such player: ${steamId}`);
      return;
    }

    const game = await this.gamesService.getById(gameId);
    if (game) {
      const slot = game.slots.find(s => s.playerId === player.id);
      if (slot) {
        slot.connectionStatus = connectionStatus;
        await game.save();
        this.gamesGateway.emitGameUpdated(game);
      } else {
        this.logger.warn(`player ${player.name} does not belong in this game`);
      }
    } else {
      this.logger.warn(`no such game: ${gameId}`);
    }
  }

}
