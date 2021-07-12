import { Injectable, Logger } from '@nestjs/common';
import { PlayersService } from '@/players/services/players.service';
import { PlayerConnectionStatus } from '../models/player-connection-status';
import { GameRuntimeService } from './game-runtime.service';
import { Game, GameDocument } from '../models/game';
import { serverCleanupDelay } from '@configs/game-servers';
import { Events } from '@/events/events';
import { SlotStatus } from '../models/slot-status';
import { GameState } from '../models/game-state';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class GameEventHandlerService {
  private logger = new Logger(GameEventHandlerService.name);

  constructor(
    @InjectModel(Game.name) private gameModel: Model<GameDocument>,
    private playersService: PlayersService,
    private gameRuntimeService: GameRuntimeService,
    private events: Events,
  ) {}

  async onMatchStarted(gameId: string) {
    const game = await this.gameModel.findOneAndUpdate(
      { _id: gameId, state: GameState.launching },
      { state: GameState.started },
      { new: true },
    );
    if (game) {
      this.events.gameChanges.next({ game: game.toJSON() });
    }

    return game;
  }

  async onMatchEnded(gameId: string) {
    const game = await this.gameModel.findOneAndUpdate(
      { _id: gameId, state: GameState.started },
      {
        state: GameState.ended,
        'slots.$[element].status': `${SlotStatus.active}`,
      },
      {
        new: true, // return updated document
        arrayFilters: [
          { 'element.status': { $eq: `${SlotStatus.waitingForSubstitute}` } },
        ],
      },
    );

    if (game) {
      this.events.gameChanges.next({ game: game.toJSON() });
      this.events.substituteRequestsChange.next();

      await Promise.all(
        game.slots
          .map((slot) => slot.player)
          .map((playerId) =>
            this.playersService.updatePlayer(playerId.toString(), {
              $unset: { activeGame: 1 },
            }),
          ),
      );

      setTimeout(
        () => this.gameRuntimeService.cleanupServer(game.gameServer.toString()),
        serverCleanupDelay,
      );
    } else {
      this.logger.warn(`no such game: ${gameId}`);
    }

    return game;
  }

  async onLogsUploaded(gameId: string, logsUrl: string) {
    const game = await this.gameModel.findOneAndUpdate(
      { _id: gameId },
      { logsUrl },
      { new: true },
    );
    if (game) {
      this.events.gameChanges.next({ game: game.toJSON() });
    } else {
      this.logger.warn(`no such game: ${gameId}`);
    }

    return game;
  }

  async onDemoUploaded(gameId: string, demoUrl: string) {
    const game = await this.gameModel.findByIdAndUpdate(
      gameId,
      { demoUrl },
      { new: true },
    );
    if (game) {
      this.events.gameChanges.next({ game: game.toJSON() });
    } else {
      this.logger.warn(`no such game: ${gameId}`);
    }

    return game;
  }

  async onPlayerJoining(gameId: string, steamId: string) {
    return await this.setPlayerConnectionStatus(
      gameId,
      steamId,
      PlayerConnectionStatus.joining,
    );
  }

  async onPlayerConnected(gameId: string, steamId: string) {
    return await this.setPlayerConnectionStatus(
      gameId,
      steamId,
      PlayerConnectionStatus.connected,
    );
  }

  async onPlayerDisconnected(gameId: string, steamId: string) {
    return await this.setPlayerConnectionStatus(
      gameId,
      steamId,
      PlayerConnectionStatus.offline,
    );
  }

  async onScoreReported(gameId: string, teamName: string, score: string) {
    const fixedTeamName = teamName.toLowerCase().substring(0, 3); // converts Red to 'red' and Blue to 'blu'
    const game = await this.gameModel.findOneAndUpdate(
      { _id: gameId },
      { [`score.${fixedTeamName}`]: parseInt(score, 10) },
      { new: true },
    );
    if (game) {
      this.events.gameChanges.next({ game: game.toJSON() });
    } else {
      this.logger.warn(`no such game: ${gameId}`);
    }

    return game;
  }

  private async setPlayerConnectionStatus(
    gameId: string,
    steamId: string,
    connectionStatus: PlayerConnectionStatus,
  ) {
    const player = await this.playersService.findBySteamId(steamId);
    if (!player) {
      this.logger.warn(`no such player: ${steamId}`);
      return;
    }

    const game = await this.gameModel.findByIdAndUpdate(
      gameId,
      {
        'slots.$[element].connectionStatus': connectionStatus,
      },
      {
        new: true, // return updated document
        arrayFilters: [{ 'element.player': { $eq: player.id } }],
      },
    );

    if (game) {
      this.events.gameChanges.next({ game: game.toJSON() });
    } else {
      this.logger.warn(`no such game: ${gameId}`);
    }

    return game;
  }
}
