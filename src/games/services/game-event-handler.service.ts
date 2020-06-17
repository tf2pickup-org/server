import { Injectable, Logger } from '@nestjs/common';
import { PlayersService } from '@/players/services/players.service';
import { PlayerConnectionStatus } from '../models/player-connection-status';
import { GameRuntimeService } from './game-runtime.service';
import { GamesGateway } from '../gateways/games.gateway';
import { QueueGateway } from '@/queue/gateways/queue.gateway';
import { InjectModel } from 'nestjs-typegoose';
import { Game } from '../models/game';
import { ReturnModelType } from '@typegoose/typegoose';
import { serverCleanupDelay } from '@configs/game-servers';

@Injectable()
export class GameEventHandlerService {

  private logger = new Logger(GameEventHandlerService.name);

  constructor(
    @InjectModel(Game) private gameModel: ReturnModelType<typeof Game>,
    private playersService: PlayersService,
    private gameRuntimeService: GameRuntimeService,
    private gamesGateway: GamesGateway,
    private queueGateway: QueueGateway,
  ) { }

  async onMatchStarted(gameId: string) {
    const game = await this.gameModel.findOneAndUpdate({ _id: gameId, state: 'launching' }, { state: 'started' }, { new: true });
    if (game) {
      this.gamesGateway.emitGameUpdated(game);
    }

    return game;
  }

  async onMatchEnded(gameId: string) {
    const game = await this.gameModel.findOneAndUpdate({ _id: gameId, state: 'started' }, { state: 'ended' }, { new: true });
    if (game) {
      game.slots.forEach(slot => {
        if (slot.status === 'waiting for substitute') {
          slot.status = 'active';
        }
      });

      await game.save();

      this.gamesGateway.emitGameUpdated(game);
      this.queueGateway.updateSubstituteRequests();
      setTimeout(() => this.gameRuntimeService.cleanupServer(game.gameServer.toString()), serverCleanupDelay);
    } else {
      this.logger.warn(`no such game: ${gameId}`);
    }

    return game;
  }

  async onLogsUploaded(gameId: string, logsUrl: string) {
    const game = await this.gameModel.findOneAndUpdate({ _id: gameId }, { logsUrl }, { new: true });
    if (game) {
      this.gamesGateway.emitGameUpdated(game);
    } else {
      this.logger.warn(`no such game: ${gameId}`);
    }

    return game;
  }

  async onPlayerJoining(gameId: string, steamId: string) {
    return await this.setPlayerConnectionStatus(gameId, steamId, 'joining');
  }

  async onPlayerConnected(gameId: string, steamId: string) {
    return await this.setPlayerConnectionStatus(gameId, steamId, 'connected');
  }

  async onPlayerDisconnected(gameId: string, steamId: string) {
    return await this.setPlayerConnectionStatus(gameId, steamId, 'offline');
  }

  async onScoreReported(gameId: string, teamName: string, score: string) {
    const fixedTeamName = teamName.toLowerCase().substring(0, 3); // converts Red to 'red' and Blue to 'blu'
    const game = await this.gameModel.findOneAndUpdate({ _id: gameId }, { [`score.${fixedTeamName}`]: parseInt(score, 10) }, { new: true });
    if (game) {
      this.gamesGateway.emitGameUpdated(game);
    } else {
      this.logger.warn(`no such game: ${gameId}`);
    }

    return game;
  }

  private async setPlayerConnectionStatus(gameId: string, steamId: string, connectionStatus: PlayerConnectionStatus) {
    const player = await this.playersService.findBySteamId(steamId);
    if (!player) {
      this.logger.warn(`no such player: ${steamId}`);
      return;
    }

    const game = await this.gameModel.findById(gameId);
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

    return game;
  }

}
