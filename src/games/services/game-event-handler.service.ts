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
import { GameEventType } from '../models/game-event';
import { PlayerEventType } from '../models/player-event';
import { GameId } from '../game-id';

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
        await this.onPlayerJoinedGameServer(gameId, steamId),
    );
    this.events.playerJoinedTeam.subscribe(
      async ({ gameId, steamId }) =>
        await this.onPlayerJoinedTeam(gameId, steamId),
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
                  event: GameEventType.Ended,
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
        setTimeout(() => this.freeAllPlayers(newGame._id), 5000),
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
      PlayerEventType.joinsGameServer,
    );
  }

  async onPlayerJoinedTeam(gameId: GameId, steamId: string): Promise<Game> {
    return await this.registerPlayerEvent(
      gameId,
      steamId,
      PlayerEventType.joinsGameServerTeam,
    );
  }

  async onPlayerDisconnected(gameId: GameId, steamId: string): Promise<Game> {
    return await this.registerPlayerEvent(
      gameId,
      steamId,
      PlayerEventType.leavesGameServer,
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
    eventType: PlayerEventType,
  ): Promise<Game> {
    const connectionStatus: PlayerConnectionStatus = {
      [PlayerEventType.replacesPlayer]: PlayerConnectionStatus.offline,
      [PlayerEventType.joinsGameServer]: PlayerConnectionStatus.joining,
      [PlayerEventType.joinsGameServerTeam]: PlayerConnectionStatus.connected,
      [PlayerEventType.leavesGameServer]: PlayerConnectionStatus.offline,
    }[eventType];

    return await this.mutex.runExclusive(async () => {
      const player = await this.playersService.findBySteamId(steamId);
      if (!player) {
        throw new Error(`no such player: ${steamId}`);
      }

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
                'slots.$[element].events': { event: eventType },
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
    const game = await this.gameModel.findById(gameId).orFail();

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
