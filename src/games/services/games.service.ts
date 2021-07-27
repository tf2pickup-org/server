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
import { Model } from 'mongoose';

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
  ) {}

  async getGameCount(): Promise<number> {
    return await this.gameModel.estimatedDocumentCount();
  }

  async getById(gameId: string | ObjectId): Promise<GameDocument> {
    return await this.gameModel.findById(gameId);
  }

  async getRunningGames(): Promise<GameDocument[]> {
    return await this.gameModel.find({ state: /launching|started/ });
  }

  async getGames(
    sort: GameSortOptions = { launchedAt: -1 },
    limit: number,
    skip: number,
  ) {
    return await this.gameModel.find().sort(sort).limit(limit).skip(skip);
  }

  async getPlayerGames(
    playerId: string,
    sort: GameSortOptions = { launchedAt: -1 },
    limit = 10,
    skip = 0,
  ) {
    return await this.gameModel
      .find({ 'slots.player': new ObjectId(playerId) })
      .sort(sort)
      .limit(limit)
      .skip(skip);
  }

  async getPlayerGameCount(
    playerId: string,
    options: GetPlayerGameCountOptions = {},
  ) {
    const defaultOptions: GetPlayerGameCountOptions = { endedOnly: false };
    const _options = { ...defaultOptions, ...options };

    let criteria: any = { 'slots.player': playerId };
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

  async getPlayerActiveGame(playerId: string): Promise<GameDocument> {
    return await this.gameModel.findOne({
      state: /launching|started/,
      slots: {
        $elemMatch: {
          status: { $in: [SlotStatus.active, SlotStatus.waitingForSubstitute] },
          player: playerId,
        },
      },
    });
  }

  async create(
    queueSlots: QueueSlot[],
    map: string,
    friends: string[][] = [],
  ): Promise<GameDocument> {
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
      player: s.playerId,
    }));
    const gameNo = await this.getNextGameNumber();

    const game = await this.gameModel.create({
      number: gameNo,
      map,
      slots,
      assignedSkills,
    });

    this.logger.debug(`game #${game.number} created`);
    this.events.gameCreated.next({ game: game.toJSON() });

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
  async getGamesWithSubstitutionRequests(): Promise<GameDocument[]> {
    return this.gameModel.find({
      state: { $in: [GameState.launching, GameState.started] },
      'slots.status': SlotStatus.waitingForSubstitute,
    });
  }

  /**
   * @returns Games with no game server assigned.
   */
  async getOrphanedGames(): Promise<GameDocument[]> {
    return this.gameModel.find({
      state: GameState.launching,
      gameServer: { $exists: false },
    });
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
      const defaultPlayerSkill =
        await this.configurationService.getDefaultPlayerSkill();
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
