import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Game, GameDocument } from '../models/game';
import { QueueSlot } from '@/queue/queue-slot';
import { PlayerSlot, pickTeams } from '../utils/pick-teams';
import { PlayersService } from '@/players/services/players.service';
import { PlayerSkillService } from '@/players/services/player-skill.service';
import { QueueConfigService } from '@/queue/services/queue-config.service';
import { GameLauncherService } from './game-launcher.service';
import { ObjectId } from 'mongodb';
import { shuffle } from 'lodash';
import { Events } from '@/events/events';
import { SlotStatus } from '../models/slot-status';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { GameState } from '../models/game-state';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model, UpdateQuery } from 'mongoose';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { PlayerNotInThisGameError } from '../errors/player-not-in-this-game.error';
import { URL } from 'url';
import { GameInWrongStateError } from '../errors/game-in-wrong-state.error';
import { SelectedVoiceServer } from '@/configuration/models/voice-server';
import { plainToClass } from 'class-transformer';

interface GameSortOptions {
  launchedAt: 1 | -1;
}

interface GetPlayerGameCountOptions {
  endedOnly?: boolean;
}

@Injectable()
export class GamesService {
  private logger = new Logger(GamesService.name);

  constructor(
    @InjectModel(Game.name) private gameModel: Model<GameDocument>,
    @Inject(forwardRef(() => PlayersService))
    private playersService: PlayersService,
    private playerSkillService: PlayerSkillService,
    private queueConfigService: QueueConfigService,
    @Inject(forwardRef(() => GameLauncherService))
    private gameLauncherService: GameLauncherService,
    private events: Events,
    private configurationService: ConfigurationService,
    private gameServersService: GameServersService,
  ) {}

  async getGameCount(): Promise<number> {
    return await this.gameModel.estimatedDocumentCount();
  }

  async getById(gameId: string | ObjectId): Promise<Game> {
    return plainToClass(
      Game,
      await this.gameModel.findById(gameId).orFail().lean().exec(),
    );
  }

  async getByLogSecret(logSecret: string): Promise<Game> {
    return plainToClass(
      Game,
      await this.gameModel.findOne({ logSecret }).orFail().lean().exec(),
    );
  }

  async getRunningGames(): Promise<Game[]> {
    return plainToClass(
      Game,
      await this.gameModel
        .find({ state: /launching|started/ })
        .lean()
        .exec(),
    );
  }

  async getGames(
    sort: GameSortOptions = { launchedAt: -1 },
    limit: number,
    skip: number,
  ): Promise<Game[]> {
    return plainToClass(
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
    playerId: string,
    sort: GameSortOptions = { launchedAt: -1 },
    limit = 10,
    skip = 0,
  ): Promise<Game[]> {
    return plainToClass(
      Game,
      await this.gameModel
        .find({ 'slots.player': new ObjectId(playerId) })
        .sort(sort)
        .limit(limit)
        .skip(skip)
        .lean()
        .exec(),
    );
  }

  async getPlayerGameCount(
    playerId: string,
    options: GetPlayerGameCountOptions = {},
  ) {
    const defaultOptions: GetPlayerGameCountOptions = { endedOnly: false };
    const _options = { ...defaultOptions, ...options };

    let criteria: any = { 'slots.player': new ObjectId(playerId) };
    if (_options.endedOnly) {
      criteria = { ...criteria, state: 'ended' };
    }

    return await this.gameModel.countDocuments(criteria);
  }

  async getPlayerPlayedClassCount(
    playerId: string,
  ): Promise<{ [gameClass in Tf2ClassName]?: number }> {
    // FIXME store player stats in a separate model to avoid this query
    const allGames = await this.gameModel.find({
      'slots.player': new ObjectId(playerId),
      state: GameState.ended,
    });
    return this.queueConfigService.queueConfig.classes
      .map((cls) => cls.name)
      .reduce((prev, gameClass) => {
        prev[gameClass] = allGames.filter(
          (g) => g.findPlayerSlot(playerId)?.gameClass === gameClass,
        ).length;
        return prev;
      }, {});
  }

  async create(
    queueSlots: QueueSlot[],
    map: string,
    friends: string[][] = [],
  ): Promise<Game> {
    if (!queueSlots.every((slot) => !!slot.playerId)) {
      throw new Error('queue not full');
    }

    const players: PlayerSlot[] = await Promise.all(
      queueSlots.map((slot) => this.queueSlotToPlayerSlot(slot)),
    );
    const assignedSkills = players.reduce((prev, curr) => {
      prev[curr.playerId] = curr.skill;
      return prev;
    }, {});
    const slots = pickTeams(shuffle(players), { friends }).map((s) => ({
      ...s,
      player: new ObjectId(s.playerId),
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
          this.playersService.updatePlayer(playerId.toString(), {
            activeGame: game.id,
          }),
        ),
    );

    return game;
  }

  async updateGame(
    gameId: string | ObjectId,
    update: UpdateQuery<Game>,
    adminId?: string,
  ): Promise<Game> {
    const game = plainToClass(
      Game,
      await this.gameModel
        .findOneAndUpdate({ _id: gameId }, update, { new: true })
        .lean()
        .exec(),
    );
    this.events.gameChanges.next({ game, adminId });
    return game;
  }

  /**
   * @deprecated Use GameLauncherService.launch()
   * @param gameId The game to be launched.
   */
  async launch(gameId: string) {
    await this.gameLauncherService.launch(gameId);
  }

  async getMostActivePlayers() {
    return this.gameModel.aggregate([
      { $match: { state: GameState.ended } },
      { $unwind: '$slots' },
      { $group: { _id: '$slots.player', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { player: { $toString: '$_id' }, count: 1, _id: 0 } },
    ]);
  }

  async getMostActiveMedics() {
    return this.gameModel.aggregate([
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
    return plainToClass(
      Game,
      await this.gameModel
        .find({
          state: { $in: [GameState.launching, GameState.started] },
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
    return plainToClass(
      Game,
      await this.gameModel
        .find({
          state: GameState.launching,
          gameServer: { $exists: false },
        })
        .lean()
        .exec(),
    );
  }

  async getVoiceChannelUrl(
    gameId: string,
    playerId: string,
  ): Promise<string | null> {
    const game = await this.getById(gameId);
    if (![GameState.launching, GameState.started].includes(game.state)) {
      throw new GameInWrongStateError(game.state);
    }

    const player = await this.playersService.getById(playerId);
    const slot = game.findPlayerSlot(playerId);

    if (!slot) {
      throw new PlayerNotInThisGameError(playerId, gameId);
    }

    const voiceServer = await this.configurationService.getVoiceServer();
    switch (voiceServer.type) {
      case SelectedVoiceServer.none:
        return null;

      case SelectedVoiceServer.staticLink:
        return voiceServer.staticLink;

      case SelectedVoiceServer.mumble: {
        if (!game.gameServer) {
          return null;
        }

        const gameServer = await this.gameServersService.getById(
          game.gameServer.toString(),
        );

        const url = new URL(`mumble://${voiceServer.mumble.url}`);
        url.pathname = `${voiceServer.mumble.channelName}/${
          gameServer.voiceChannelName
        }/${slot.team.toUpperCase()}`;
        url.username = player.name.replace(/\s+/g, '_');
        if (voiceServer.mumble.password) {
          url.password = voiceServer.mumble.password;
        }
        url.protocol = 'mumble:';
        return url.toString();
      }
    }
  }

  private async queueSlotToPlayerSlot(
    queueSlot: QueueSlot,
  ): Promise<PlayerSlot> {
    const { playerId, gameClass } = queueSlot;
    const player = await this.playersService.getById(playerId);
    if (!player) {
      throw new Error(`no such player (${playerId})`);
    }

    const skill = await this.playerSkillService.getPlayerSkill(playerId);
    if (skill) {
      const skillForClass = skill.get(gameClass);
      return { playerId, gameClass, skill: skillForClass };
    } else {
      const defaultPlayerSkill = (
        await this.configurationService.getDefaultPlayerSkill()
      ).value;
      return { playerId, gameClass, skill: defaultPlayerSkill.get(gameClass) };
    }
  }

  private async getNextGameNumber(): Promise<number> {
    const latestGame = await this.gameModel
      .findOne()
      .sort({ launchedAt: -1 })
      .exec();
    if (latestGame) {
      return latestGame.number + 1;
    } else {
      return 1;
    }
  }
}
