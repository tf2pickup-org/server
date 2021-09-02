import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PlayersService } from '@/players/services/players.service';
import { PlayerConnectionStatus } from '../models/player-connection-status';
import { GameRuntimeService } from './game-runtime.service';
import { Game, GameDocument } from '../models/game';
import { serverCleanupDelay } from '@configs/game-servers';
import { Events } from '@/events/events';
import { SlotStatus } from '../models/slot-status';
import { GameState } from '../models/game-state';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, Error } from 'mongoose';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { plainToClass } from 'class-transformer';
import { GamesService } from './games.service';

@Injectable()
export class GameEventHandlerService implements OnModuleDestroy {
  private logger = new Logger(GameEventHandlerService.name);
  private timers: NodeJS.Timer[] = [];

  constructor(
    @InjectModel(Game.name) private gameModel: Model<GameDocument>,
    private playersService: PlayersService,
    private gameRuntimeService: GameRuntimeService,
    private events: Events,
    private gamesService: GamesService,
  ) {}

  onModuleDestroy() {
    this.timers.forEach((t) => clearTimeout(t));
  }

  async onMatchStarted(gameId: string): Promise<Game | null> {
    try {
      const game = plainToClass(
        Game,
        await this.gameModel
          .findOneAndUpdate(
            { _id: new Types.ObjectId(gameId), state: GameState.launching },
            { state: GameState.started },
            { new: true },
          )
          .orFail()
          .lean()
          .exec(),
      );

      this.events.gameChanges.next({ game });
      return game;
    } catch (error) {
      if (error instanceof Error.DocumentNotFoundError) {
        return null;
      } else {
        throw error;
      }
    }
  }

  async onMatchEnded(gameId: string): Promise<Game> {
    const game = plainToClass(
      Game,
      await this.gameModel
        .findOneAndUpdate(
          { _id: new Types.ObjectId(gameId), state: GameState.started },
          {
            state: GameState.ended,
            'slots.$[element].status': `${SlotStatus.active}`,
          },
          {
            new: true, // return updated document
            arrayFilters: [
              {
                'element.status': { $eq: `${SlotStatus.waitingForSubstitute}` },
              },
            ],
          },
        )
        .orFail()
        .lean()
        .exec(),
    );

    this.events.gameChanges.next({ game });
    this.events.substituteRequestsChange.next();

    await this.freeAllMedics(game.id);
    this.timers.push(setTimeout(() => this.freeAllPlayers(game.id), 5000));
    this.timers.push(
      setTimeout(
        () => this.gameRuntimeService.cleanupServer(game.gameServer.toString()),
        serverCleanupDelay,
      ),
    );

    return game;
  }

  async onLogsUploaded(gameId: string, logsUrl: string): Promise<Game> {
    return this.gamesService.update(gameId, { logsUrl });
  }

  async onDemoUploaded(gameId: string, demoUrl: string): Promise<Game> {
    return this.gamesService.update(gameId, { demoUrl });
  }

  async onPlayerJoining(gameId: string, steamId: string): Promise<Game> {
    return await this.setPlayerConnectionStatus(
      gameId,
      steamId,
      PlayerConnectionStatus.joining,
    );
  }

  async onPlayerConnected(gameId: string, steamId: string): Promise<Game> {
    return await this.setPlayerConnectionStatus(
      gameId,
      steamId,
      PlayerConnectionStatus.connected,
    );
  }

  async onPlayerDisconnected(gameId: string, steamId: string): Promise<Game> {
    return await this.setPlayerConnectionStatus(
      gameId,
      steamId,
      PlayerConnectionStatus.offline,
    );
  }

  async onScoreReported(
    gameId: string,
    teamName: string,
    score: string,
  ): Promise<Game> {
    const fixedTeamName = teamName.toLowerCase().substring(0, 3); // converts Red to 'red' and Blue to 'blu'
    return this.gamesService.update(gameId, {
      [`score.${fixedTeamName}`]: parseInt(score, 10),
    });
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

    const game = plainToClass(
      Game,
      await this.gameModel
        .findByIdAndUpdate(
          gameId,
          {
            'slots.$[element].connectionStatus': connectionStatus,
          },
          {
            new: true, // return updated document
            arrayFilters: [{ 'element.player': { $eq: player._id } }],
          },
        )
        .orFail()
        .lean()
        .exec(),
    );

    this.events.gameChanges.next({ game });
    return game;
  }

  private async freeAllMedics(gameId: string) {
    const game = await this.gameModel.findById(gameId);

    await Promise.all(
      game.slots
        .filter((slot) => slot.gameClass === Tf2ClassName.medic)
        .map((slot) => slot.player)
        .map((playerId) =>
          this.playersService.updatePlayer(playerId.toString(), {
            $unset: { activeGame: 1 },
          }),
        ),
    );
  }

  private async freeAllPlayers(gameId: string) {
    const game = await this.gameModel.findById(gameId);

    await Promise.all(
      game.slots
        .map((slot) => slot.player)
        .map((playerId) =>
          this.playersService.updatePlayer(playerId.toString(), {
            $unset: { activeGame: 1 },
          }),
        ),
    );
  }
}
