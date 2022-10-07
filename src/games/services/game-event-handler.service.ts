import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PlayersService } from '@/players/services/players.service';
import { PlayerConnectionStatus } from '../models/player-connection-status';
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
import { Tf2Team } from '../models/tf2-team';

@Injectable()
export class GameEventHandlerService implements OnModuleInit, OnModuleDestroy {
  private logger = new Logger(GameEventHandlerService.name);
  private timers: NodeJS.Timer[] = [];

  constructor(
    @InjectModel(Game.name) private gameModel: Model<GameDocument>,
    private playersService: PlayersService,
    private events: Events,
    private gamesService: GamesService,
    @Inject('GAME_MODEL_MUTEX') private mutex: Mutex,
  ) {}

  onModuleInit() {
    this.events.matchStarted.subscribe(
      async ({ gameId }) => await this.onMatchStarted(gameId),
    );
    this.events.matchEnded.subscribe(
      async ({ gameId }) => await this.onMatchEnded(gameId),
    );
    this.events.playerJoinedGameServer.subscribe(
      async ({ gameId, steamId }) =>
        await this.onPlayerJoining(gameId, steamId),
    );
    this.events.playerJoinedTeam.subscribe(
      async ({ gameId, steamId }) =>
        await this.onPlayerConnected(gameId, steamId),
    );
    this.events.playerDisconnectedFromGameServer.subscribe(
      async ({ gameId, steamId }) =>
        await this.onPlayerDisconnected(gameId, steamId),
    );
    this.events.scoreReported.subscribe(
      async ({ gameId, teamName, score }) =>
        await this.onScoreReported(gameId, teamName, score),
    );
    this.events.logsUploaded.subscribe(
      async ({ gameId, logsUrl }) => await this.onLogsUploaded(gameId, logsUrl),
    );
    this.events.demoUploaded.subscribe(
      async ({ gameId, demoUrl }) => await this.onDemoUploaded(gameId, demoUrl),
    );
  }

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
    team: Tf2Team,
    score: number,
  ): Promise<Game> {
    return this.gamesService.update(gameId, { [`score.${team}`]: score });
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
