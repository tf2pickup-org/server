import { Injectable, Logger } from '@nestjs/common';
import { GamesService } from './games.service';
import { PlayersService } from '@/players/services/players.service';
import { PlayerConnectionStatus } from '../models/player-connection-status';
import { ConfigService } from '@nestjs/config';
import { GameRuntimeService } from './game-runtime.service';
import { GamesGateway } from '../gateways/games.gateway';
import { QueueGateway } from '@/queue/gateways/queue.gateway';
import { InjectModel } from 'nestjs-typegoose';
import { Game } from '../models/game';
import { ReturnModelType } from '@typegoose/typegoose';

@Injectable()
export class GameEventHandlerService {

  private logger = new Logger(GameEventHandlerService.name);
  private serverCleanupDelay = this.configService.get<number>('serverCleanupDelay');

  constructor(
    @InjectModel(Game) private gameModel: ReturnModelType<typeof Game>,
    private gamesService: GamesService,
    private playersService: PlayersService,
    private configService: ConfigService,
    private gameRuntimeService: GameRuntimeService,
    private gamesGateway: GamesGateway,
    private queueGateway: QueueGateway,
  ) { }

  async onMatchStarted(gameId: string) {
    const game = await this.gameModel.findOneAndUpdate({ _id: gameId, state: 'launching' }, { state: 'started' });
    if (game) {
      this.gamesGateway.emitGameUpdated(game);
    }
  }

  async onMatchEnded(gameId: string) {
    const game = await this.gameModel.findOneAndUpdate({ _id: gameId, state: 'started' }, { state: 'ended' });
    if (game) {
      game.slots.forEach(slot => {
        if (slot.status === 'waiting for substitute') {
          slot.status = 'active';
        }
      });

      await game.save();

      this.gamesGateway.emitGameUpdated(game);
      this.queueGateway.updateSubstituteRequests();
      setTimeout(() => this.gameRuntimeService.cleanupServer(game.gameServer.toString()), this.serverCleanupDelay);
    } else {
      this.logger.warn(`no such game: ${gameId}`);
    }
  }

  async onLogsUploaded(gameId: string, logsUrl: string) {
    const game = await this.gameModel.findOneAndUpdate({ _id: gameId }, { logsUrl });
    if (game) {
      this.gamesGateway.emitGameUpdated(game);
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

  async onScoreReported(gameId: string, teamName: string, score: string) {
    const fixedTeamName = teamName.toLowerCase().substring(0, 3); // converts Red to 'red' and Blue to 'blu'
    const game = await this.gameModel.findOneAndUpdate({ _id: gameId }, { [`score.${fixedTeamName}`]: parseInt(score, 10) });
    if (game) {
      this.gamesGateway.emitGameUpdated(game);
    } else {
      this.logger.warn(`no such game: ${gameId}`);
    }
  }

  private async setPlayerConnectionStatus(gameId: string, steamId: string, connectionStatus: PlayerConnectionStatus) {
    const player = await this.playersService.findBySteamId(steamId);
    if (!player) {
      this.logger.warn(`no such player: ${steamId}`);
      return;
    }

    const game = await this.gamesService.getById(gameId);
    if (game) {
      const slot = game.findPlayerSlot(player.id);
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
