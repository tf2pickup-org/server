import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PlayersService } from '@/players/services/players.service';
import { PlayerConnectionStatus } from '../models/player-connection-status';
import { GameRuntimeService } from './game-runtime.service';
import { Game, GameDocument } from '../models/game';
import { Events } from '@/events/events';
import { SlotStatus } from '../models/slot-status';
import { GameState } from '../models/game-state';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, Error } from 'mongoose';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { plainToInstance } from 'class-transformer';
import { GamesService } from './games.service';
import { Mutex } from 'async-mutex';

@Injectable()
export class GameEventHandlerService implements OnModuleDestroy {
  private logger = new Logger(GameEventHandlerService.name);
  private timers: NodeJS.Timer[] = [];
  private mutex = new Mutex();

  constructor(
    @InjectModel(Game.name) private gameModel: Model<GameDocument>,
    private playersService: PlayersService,
    private gameRuntimeService: GameRuntimeService,
    private events: Events,
    private gamesService: GamesService,
  ) {}

  onModuleDestroy() {
    this.timers.forEach((t) => clearTimeout(t));
    this.timers = [];
  }

  async onMatchStarted(gameId: string): Promise<Game | null> {
    return await this.mutex.runExclusive(async () => {
      try {
        const oldGame = await this.gamesService.getById(gameId);
        const newGame = plainToInstance(
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

        this.events.gameChanges.next({ oldGame, newGame });
        return newGame;
      } catch (error) {
        if (error instanceof Error.DocumentNotFoundError) {
          return null;
        } else {
          throw error;
        }
      }
    });
  }

  async onMatchEnded(gameId: string): Promise<Game> {
    return await this.mutex.runExclusive(async () => {
      const oldGame = await this.gamesService.getById(gameId);
      const newGame = plainToInstance(
        Game,
        await this.gameModel
          .findOneAndUpdate(
            { _id: new Types.ObjectId(gameId), state: GameState.started },
            {
              state: GameState.ended,
              endedAt: new Date(),
              'slots.$[element].status': `${SlotStatus.active}`,
            },
            {
              new: true, // return updated document
              arrayFilters: [
                {
                  'element.status': {
                    $eq: `${SlotStatus.waitingForSubstitute}`,
                  },
                },
              ],
            },
          )
          .orFail()
          .lean()
          .exec(),
      );

      this.logger.log(`game #${newGame.number} ended`);
      this.events.gameChanges.next({ oldGame, newGame });
      this.events.substituteRequestsChange.next();

      await this.freeAllMedics(newGame.id);
      this.timers.push(setTimeout(() => this.freeAllPlayers(newGame.id), 5000));
      return newGame;
    });
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
    return await this.mutex.runExclusive(async () => {
      const player = await this.playersService.findBySteamId(steamId);
      if (!player) {
        this.logger.warn(`no such player: ${steamId}`);
        return;
      }

      const oldGame = await this.gamesService.getById(gameId);
      const newGame = plainToInstance(
        Game,
        await this.gameModel
          .findByIdAndUpdate(
            gameId,
            {
              'slots.$[element].connectionStatus': connectionStatus,
            },
            {
              new: true, // return updated document
              arrayFilters: [
                { 'element.player': { $eq: new Types.ObjectId(player.id) } },
              ],
            },
          )
          .orFail()
          .lean()
          .exec(),
      );

      this.events.gameChanges.next({ oldGame, newGame });
      return newGame;
    });
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
