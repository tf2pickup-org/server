import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Game, GameDocument } from '../models/game';
import { QueueSlot } from '@/queue/queue-slot';
import { PlayerSlot, pickTeams } from '../utils/pick-teams';
import { PlayersService } from '@/players/services/players.service';
import { shuffle } from 'lodash';
import { Events } from '@/events/events';
import { SlotStatus } from '../models/slot-status';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { GameState } from '../models/game-state';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model, UpdateQuery, Types } from 'mongoose';
import { PlayerNotInThisGameError } from '../errors/player-not-in-this-game.error';
import { URL } from 'url';
import { GameInWrongStateError } from '../errors/game-in-wrong-state.error';
import { plainToInstance } from 'class-transformer';
import { Mutex } from 'async-mutex';
import { GameEventType } from '../models/game-event-type';
import { VoiceServerType } from '../voice-server-type';
import { GameId } from '../game-id';
import { PlayerId } from '@/players/types/player-id';
import { PlayerConnectionStatus } from '../models/player-connection-status';
import { PlayerReplaced } from '../models/events/player-replaced';
import { PlayerLeftGameServer } from '../models/events/player-left-game-server';

interface GameSortOptions {
  [key: string]: 1 | -1;
}

interface GetPlayerGameCountOptions {
  endedOnly?: boolean;
}

@Injectable()
export class GamesService {
  private logger = new Logger(GamesService.name);

  constructor(
    @InjectModel('Game') private gameModel: Model<GameDocument>,
    @Inject(forwardRef(() => PlayersService))
    private playersService: PlayersService,
    private events: Events,
    private configurationService: ConfigurationService,
    @Inject('GAME_MODEL_MUTEX') private mutex: Mutex,
  ) {}

  async getGameCount(): Promise<number> {
    return await this.gameModel.estimatedDocumentCount();
  }

  async getById(gameId: GameId): Promise<Game> {
    return plainToInstance(
      Game,
      await this.gameModel.findById(gameId).orFail().lean().exec(),
    );
  }

  async getByNumber(gameNumber: number): Promise<Game> {
    return plainToInstance(
      Game,
      await this.gameModel
        .findOne({ number: gameNumber })
        .orFail()
        .lean()
        .exec(),
    );
  }

  async getByLogSecret(logSecret: string): Promise<Game> {
    return plainToInstance(
      Game,
      await this.gameModel.findOne({ logSecret }).orFail().lean().exec(),
    );
  }

  async getRunningGames(): Promise<Game[]> {
    return plainToInstance(
      Game,
      await this.gameModel
        .find({
          state: {
            $in: [
              GameState.created,
              GameState.configuring,
              GameState.launching,
              GameState.started,
            ],
          },
        })
        .lean()
        .exec(),
    );
  }

  async getGames(
    sort: GameSortOptions = { 'events.0.at': -1 },
    limit = 10,
    skip = 0,
  ): Promise<Game[]> {
    return plainToInstance(
      Game,
      await this.gameModel
        .find()
        .sort(sort)
        .limit(limit)
        .skip(skip)
        .lean()
        .exec(),
    );
  }

  async getPlayerGames(
    playerId: PlayerId,
    sort: GameSortOptions = { 'events.0.at': -1 },
    limit = 10,
    skip = 0,
  ): Promise<Game[]> {
    return plainToInstance(
      Game,
      await this.gameModel
        .find({ 'slots.player': playerId })
        .sort(sort)
        .limit(limit)
        .skip(skip)
        .lean()
        .exec(),
    );
  }

  async getPlayerGameCount(
    playerId: PlayerId,
    options: GetPlayerGameCountOptions = {},
  ): Promise<number> {
    const defaultOptions: GetPlayerGameCountOptions = { endedOnly: false };
    const _options = { ...defaultOptions, ...options };

    let criteria: any = { 'slots.player': new Types.ObjectId(playerId) };
    if (_options.endedOnly) {
      criteria = { ...criteria, state: GameState.ended };
    }

    return await this.gameModel.countDocuments(criteria);
  }

  async getPlayerPlayedClassCount(
    playerId: PlayerId,
  ): Promise<{ [gameClass in Tf2ClassName]?: number }> {
    return (
      await this.gameModel.aggregate<{
        [gameClass in Tf2ClassName]?: number;
      }>([
        {
          $unwind: {
            path: '$slots',
          },
        },
        {
          $match: {
            state: GameState.ended,
            'slots.status': {
              $in: [null, 'active'],
            },
            'slots.player': new Types.ObjectId(playerId),
          },
        },
        {
          $group: {
            _id: '$slots.gameClass',
            count: {
              $sum: 1,
            },
          },
        },
        {
          $group: {
            _id: null,
            results: {
              $push: {
                k: '$_id',
                v: '$count',
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            results: {
              $arrayToObject: '$results',
            },
          },
        },
        {
          $replaceRoot: {
            newRoot: '$results',
          },
        },
      ])
    )[0];
  }

  async create(
    queueSlots: QueueSlot[],
    map: string,
    friends: PlayerId[][] = [],
  ): Promise<Game> {
    if (!queueSlots.every((slot) => Boolean(slot.playerId))) {
      throw new Error('queue not full');
    }

    const players: PlayerSlot[] = await Promise.all(
      queueSlots.map((slot) => this.queueSlotToPlayerSlot(slot)),
    );
    const assignedSkills = players.reduce<Map<PlayerId, number>>(
      (prev, curr) => {
        prev.set(curr.playerId, curr.skill);
        return prev;
      },
      new Map<PlayerId, number>(),
    );
    const slots = pickTeams(shuffle(players), { friends }).map((s) => ({
      ...s,
      player: new Types.ObjectId(s.playerId),
    }));
    const gameNo = await this.getNextGameNumber();

    const id = (
      await this.gameModel.create({
        number: gameNo,
        map,
        slots,
        assignedSkills,
      })
    )._id;

    const game = await this.getById(id);
    this.logger.debug(`game #${game.number} created`);
    this.events.gameCreated.next({ game });

    await Promise.all(
      game.slots
        .map((slot) => slot.player)
        .map((playerId) =>
          this.playersService.updatePlayer(playerId, {
            activeGame: game.id,
          }),
        ),
    );

    return game;
  }

  async forceEnd(gameId: GameId, adminId?: PlayerId) {
    const oldGame = await this.getById(gameId);
    const newGame = plainToInstance(
      Game,
      await this.gameModel
        .findByIdAndUpdate(
          gameId,
          {
            $set: {
              state: GameState.interrupted,
              error: 'ended by admin',
              'slots.$[element].status': SlotStatus.active,
            },
            $push: {
              events: {
                at: new Date(),
                event: GameEventType.gameEnded,
              },
            },
          },
          {
            new: true,
            arrayFilters: [
              { 'element.status': { $eq: SlotStatus.waitingForSubstitute } },
            ],
          },
        )
        .orFail()
        .lean()
        .exec(),
    );

    this.events.gameChanges.next({ newGame, oldGame, adminId });
    this.events.substituteRequestsChange.next();

    await Promise.all(
      newGame.slots
        .map((slot) => slot.player)
        .map((playerId) =>
          this.playersService.updatePlayer(playerId, {
            $unset: { activeGame: 1 },
          }),
        ),
    );

    this.logger.verbose(`game #${newGame.number} force ended`);
    return newGame;
  }

  async update(
    gameId: GameId,
    update: UpdateQuery<Game>,
    adminId?: PlayerId,
  ): Promise<Game> {
    return await this.mutex.runExclusive(async () => {
      const oldGame = await this.getById(gameId);
      const newGame = plainToInstance(
        Game,
        await this.gameModel
          .findOneAndUpdate({ _id: gameId }, update, { new: true })
          .orFail()
          .lean()
          .exec(),
      );
      this.events.gameChanges.next({ oldGame, newGame, adminId });
      return newGame;
    });
  }

  async getMostActivePlayers() {
    return await this.gameModel.aggregate([
      { $match: { state: GameState.ended } },
      { $unwind: '$slots' },
      { $group: { _id: '$slots.player', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { player: { $toString: '$_id' }, count: 1, _id: 0 } },
    ]);
  }

  async getMostActiveMedics() {
    return await this.gameModel.aggregate([
      { $match: { state: 'ended' } },
      { $unwind: '$slots' },
      { $match: { 'slots.gameClass': 'medic' } },
      { $group: { _id: '$slots.player', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { player: { $toString: '$_id' }, count: 1, _id: 0 } },
    ]);
  }

  /**
   * @returns Games that need player substitute.
   */
  async getGamesWithSubstitutionRequests(): Promise<Game[]> {
    return plainToInstance(
      Game,
      await this.gameModel
        .find({
          state: {
            $in: [
              GameState.created,
              GameState.configuring,
              GameState.launching,
              GameState.started,
            ],
          },
          'slots.status': SlotStatus.waitingForSubstitute,
        })
        .lean()
        .exec(),
    );
  }

  /**
   * @returns Games with no game server assigned.
   */
  async getOrphanedGames(): Promise<Game[]> {
    return plainToInstance(
      Game,
      await this.gameModel
        .find({
          state: [GameState.created],
          gameServer: { $exists: false },
        })
        .lean()
        .exec(),
    );
  }

  async getVoiceChannelUrl(
    gameId: GameId,
    playerId: PlayerId,
  ): Promise<string | null> {
    const game = await this.getById(gameId);
    if (!game.isInProgress()) {
      throw new GameInWrongStateError(gameId, game.state);
    }

    const player = await this.playersService.getById(playerId);
    const slot = game.findPlayerSlot(playerId);

    if (!slot) {
      throw new PlayerNotInThisGameError(playerId, gameId);
    }

    const voiceServerType =
      await this.configurationService.get<VoiceServerType>(
        'games.voice_server_type',
      );
    switch (voiceServerType) {
      case VoiceServerType.none:
        return null;

      case VoiceServerType.staticLink:
        return await this.configurationService.get<string>(
          'games.voice_server.static_link',
        );

      case VoiceServerType.mumble: {
        const [url, port, channelName, password] = await Promise.all([
          this.configurationService.get<string>(
            'games.voice_server.mumble.url',
          ),
          this.configurationService.get<number>(
            'games.voice_server.mumble.port',
          ),
          this.configurationService.get<string>(
            'games.voice_server.mumble.channel_name',
          ),
          this.configurationService.get<string>(
            'games.voice_server.mumble.password',
          ),
        ]);

        if (!url || !channelName) {
          throw Error('mumble configuration malformed');
        }

        const mumbleDirectLink = new URL(`mumble://${url}`);
        mumbleDirectLink.pathname = `${channelName}/${
          game.number
        }/${slot.team.toUpperCase()}`;
        mumbleDirectLink.username = player.name.replace(/\s+/g, '_');
        if (password) {
          mumbleDirectLink.password = password;
        }
        mumbleDirectLink.protocol = 'mumble:';
        mumbleDirectLink.port = `${port}`;
        return mumbleDirectLink.toString();
      }

      // no default
    }
  }

  async calculatePlayerJoinGameServerTimeout(
    gameId: GameId,
    playerId: PlayerId,
  ): Promise<number | undefined> {
    const game = await this.getById(gameId);
    const slot = game.findPlayerSlot(playerId);
    if (!slot) {
      throw new Error('no such slot');
    }

    if (
      [
        PlayerConnectionStatus.joining,
        PlayerConnectionStatus.connected,
      ].includes(slot.connectionStatus) ||
      slot.status !== SlotStatus.active
    ) {
      return undefined;
    }

    const [joinGameServerTimeout, rejoinGameServerTimeout] = await Promise.all([
      this.configurationService.get<number>('games.join_gameserver_timeout'),
      this.configurationService.get<number>('games.rejoin_gameserver_timeout'),
    ]);

    if (joinGameServerTimeout <= 0 || rejoinGameServerTimeout <= 0) {
      return undefined;
    }

    const disconnectedAt = game.events
      .filter((e) => e.event === GameEventType.playerLeftGameServer)
      .filter((e) => (e as PlayerLeftGameServer).player.equals(playerId))
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .at(0)?.at;

    const replacedAt = game.events
      .filter((e) => e.event === GameEventType.playerReplaced)
      .filter((e) => (e as PlayerReplaced).replacement.equals(playerId))
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .at(0)?.at;

    switch (game.state) {
      case GameState.launching: {
        const configuredAt = game.lastConfiguredAt;
        if (!configuredAt) {
          throw new Error('invalid game state');
        }

        return Math.max(
          configuredAt.getTime() + joinGameServerTimeout,
          replacedAt ? replacedAt.getTime() + rejoinGameServerTimeout : 0,
          disconnectedAt
            ? disconnectedAt.getTime() + rejoinGameServerTimeout
            : 0,
        );
      }

      case GameState.started: {
        if (slot.connectionStatus !== PlayerConnectionStatus.offline) {
          return undefined;
        }

        return Math.max(
          replacedAt ? replacedAt.getTime() + rejoinGameServerTimeout : 0,
          disconnectedAt
            ? disconnectedAt.getTime() + rejoinGameServerTimeout
            : 0,
        );
      }

      default:
        return undefined;
    }
  }

  private async queueSlotToPlayerSlot(
    queueSlot: QueueSlot,
  ): Promise<PlayerSlot> {
    const { playerId, gameClass } = queueSlot;
    if (!playerId) {
      throw new Error(`queue slot ${queueSlot.id} has no player`);
    }

    const player = await this.playersService.getById(playerId);
    if (!player) {
      throw new Error(`no such player (${playerId})`);
    }

    if (player.skill?.has(gameClass)) {
      return { playerId, gameClass, skill: player.skill.get(gameClass)! };
    }

    const defaultPlayerSkill = await this.configurationService.get<
      Record<Tf2ClassName, number>
    >('games.default_player_skill');
    return { playerId, gameClass, skill: defaultPlayerSkill[gameClass] };
  }

  private async getNextGameNumber(): Promise<number> {
    const latestGame = await this.gameModel
      .findOne()
      .sort({ 'events.0.at': -1 })
      .exec();

    return latestGame ? latestGame.number + 1 : 1;
  }
}
