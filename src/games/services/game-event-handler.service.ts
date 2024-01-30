import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PlayersService } from '@/players/services/players.service';
import { PlayerConnectionStatus } from '../models/player-connection-status';
import { Game } from '../models/game';
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
import { GameId } from '../types/game-id';
import { GameEventType } from '../models/game-event-type';
import { GameEndedReason } from '../models/events/game-ended';
import { GAME_MODEL_MUTEX } from '../tokens/game-model-mutex.token';

// https://github.com/microsoft/TypeScript/issues/33308
type PickEnum<T, K extends T> = {
  [P in keyof K]: P extends K ? P : never;
};

@Injectable()
export class GameEventHandlerService implements OnModuleInit, OnModuleDestroy {
  private logger = new Logger(GameEventHandlerService.name);
  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor(
    @InjectModel(Game.name) private gameModel: Model<Game>,
    private playersService: PlayersService,
    private events: Events,
    private gamesService: GamesService,
    @Inject(GAME_MODEL_MUTEX) private mutex: Mutex,
  ) {}

  onModuleInit() {
    this.events.matchStarted.subscribe(({ gameId }) =>
      this.onMatchStarted(gameId).catch((error) => this.logger.error(error)),
    );
    this.events.matchEnded.subscribe(({ gameId }) =>
      this.onMatchEnded(gameId).catch((error) => this.logger.error(error)),
    );
    this.events.playerJoinedGameServer.subscribe(
      async ({ gameId, steamId }) => {
        try {
          await this.onPlayerJoinedGameServer(gameId, steamId);
        } catch (error) {
          if (error instanceof Error.DocumentNotFoundError) {
            // player was not found
            this.logger.log(
              `player ${steamId} joined the gameserver, but they are not registered`,
            );
          } else {
            throw error;
          }
        }
      },
    );
    this.events.playerJoinedTeam.subscribe(async ({ gameId, steamId }) => {
      try {
        await this.onPlayerJoinedTeam(gameId, steamId);
      } catch (error) {
        if (error instanceof Error.DocumentNotFoundError) {
          // player was not found
          this.logger.log(
            `player ${steamId} joined a team, but they are not registered`,
          );
        } else {
          throw error;
        }
      }
    });
    this.events.playerDisconnectedFromGameServer.subscribe(
      async ({ gameId, steamId }) => {
        try {
          await this.onPlayerDisconnected(gameId, steamId);
        } catch (error) {
          if (error instanceof Error.DocumentNotFoundError) {
            // player was not found
            this.logger.log(
              `player ${steamId} disconnected, but they are not registered`,
            );
          } else {
            throw error;
          }
        }
      },
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

  async onMatchStarted(gameId: GameId): Promise<Game | null> {
    return await this.mutex.runExclusive(async () => {
      try {
        const oldGame = await this.gamesService.getById(gameId);
        const newGame = plainToInstance(
          Game,
          await this.gameModel
            .findOneAndUpdate(
              { _id: new Types.ObjectId(gameId), state: GameState.launching },
              {
                $set: {
                  state: GameState.started,
                  score: {
                    [Tf2Team.blu]: 0,
                    [Tf2Team.red]: 0,
                  },
                },
                $push: {
                  events: {
                    at: new Date(),
                    event: GameEventType.gameStarted,
                  },
                },
              },
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

  async onMatchEnded(gameId: GameId): Promise<Game> {
    return await this.mutex.runExclusive(async () => {
      const oldGame = await this.gamesService.getById(gameId);
      const newGame = plainToInstance(
        Game,
        await this.gameModel
          .findOneAndUpdate(
            { _id: new Types.ObjectId(gameId), state: GameState.started },
            {
              $set: {
                state: GameState.ended,
                'slots.$[element].status': `${SlotStatus.active}`,
              },
              $push: {
                events: {
                  at: new Date(),
                  event: GameEventType.gameEnded,
                  reason: GameEndedReason.matchEnded,
                },
              },
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

      await this.freeAllMedics(newGame._id);
      this.timers.push(
        setTimeout(async () => await this.freeAllPlayers(newGame._id), 5000),
      );
      return newGame;
    });
  }

  async onLogsUploaded(gameId: GameId, logsUrl: string): Promise<Game> {
    return await this.gamesService.update(gameId, { logsUrl });
  }

  async onDemoUploaded(gameId: GameId, demoUrl: string): Promise<Game> {
    return await this.gamesService.update(gameId, { demoUrl });
  }

  async onPlayerJoinedGameServer(
    gameId: GameId,
    steamId: string,
  ): Promise<Game> {
    return await this.registerPlayerEvent(
      gameId,
      steamId,
      GameEventType.playerJoinedGameServer,
    );
  }

  async onPlayerJoinedTeam(gameId: GameId, steamId: string): Promise<Game> {
    return await this.registerPlayerEvent(
      gameId,
      steamId,
      GameEventType.playerJoinedGameServerTeam,
    );
  }

  async onPlayerDisconnected(gameId: GameId, steamId: string): Promise<Game> {
    return await this.registerPlayerEvent(
      gameId,
      steamId,
      GameEventType.playerLeftGameServer,
    );
  }

  async onScoreReported(
    gameId: GameId,
    team: Tf2Team,
    score: number,
  ): Promise<Game> {
    return await this.gamesService.update(gameId, { [`score.${team}`]: score });
  }

  private async registerPlayerEvent(
    gameId: GameId,
    steamId: string,
    eventType: PickEnum<
      GameEventType,
      | GameEventType.playerJoinedGameServer
      | GameEventType.playerJoinedGameServerTeam
      | GameEventType.playerLeftGameServer
    >,
  ): Promise<Game> {
    const connectionStatus: PlayerConnectionStatus = {
      [GameEventType.playerJoinedGameServer]: PlayerConnectionStatus.joining,
      [GameEventType.playerJoinedGameServerTeam]:
        PlayerConnectionStatus.connected,
      [GameEventType.playerLeftGameServer]: PlayerConnectionStatus.offline,
    }[eventType];

    return await this.mutex.runExclusive(async () => {
      const player = await this.playersService.findBySteamId(steamId);
      const oldGame = await this.gamesService.getById(gameId);
      const newGame = plainToInstance(
        Game,
        await this.gameModel
          .findByIdAndUpdate(
            gameId,
            {
              $set: {
                'slots.$[element].connectionStatus': connectionStatus,
              },
              $push: {
                events: { event: eventType, player: player._id },
              },
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

  private async freeAllMedics(gameId: GameId) {
    const game = await this.gameModel.findById(gameId).orFail();

    await Promise.all(
      game.slots
        .filter((slot) => slot.gameClass === Tf2ClassName.medic)
        .map((slot) => slot.player)
        .map((playerId) =>
          this.playersService.updatePlayer(playerId, {
            $unset: { activeGame: 1 },
          }),
        ),
    );
  }

  private async freeAllPlayers(gameId: GameId) {
    const game = await this.gamesService.getById(gameId);

    await Promise.all(
      game.slots
        .map((slot) => slot.player)
        .map((playerId) =>
          this.playersService.updatePlayer(playerId, {
            $unset: { activeGame: 1 },
          }),
        ),
    );
  }
}
