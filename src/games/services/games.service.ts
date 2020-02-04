import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from 'nestjs-typegoose';
import { ReturnModelType, DocumentType } from '@typegoose/typegoose';
import { Game } from '../models/game';
import { QueueSlot } from '@/queue/queue-slot';
import { PlayerSlot, pickTeams } from '../utils/pick-teams';
import { PlayersService } from '@/players/services/players.service';
import { PlayerSkillService } from '@/players/services/player-skill.service';
import { QueueConfigService } from '@/queue/services/queue-config.service';
import { GameLauncherService } from './game-launcher.service';
import { GamesGateway } from '../gateways/games.gateway';

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
    @InjectModel(Game) private gameModel: ReturnModelType<typeof Game>,
    @Inject(forwardRef(() => PlayersService)) private playersService: PlayersService,
    private playerSkillService: PlayerSkillService,
    private queueConfigService: QueueConfigService,
    @Inject(forwardRef(() => GameLauncherService)) private gameLauncherService: GameLauncherService,
    @Inject(forwardRef(() => GamesGateway)) private gamesGateway: GamesGateway,
  ) { }

  async getGameCount(): Promise<number> {
    return await this.gameModel.estimatedDocumentCount();
  }

  async getById(gameId: string): Promise<DocumentType<Game>> {
    return await this.gameModel.findById(gameId);
  }

  async getRunningGames(): Promise<Array<DocumentType<Game>>> {
    return await this.gameModel.find({ state: /launching|started/ });
  }

  async findByAssignedGameServer(gameServerId: string): Promise<DocumentType<Game>> {
    return (await this.gameModel
      .find({ gameServer: gameServerId })
      .sort({ launchedAt: -1 })
      .limit(1))?.[0];
  }

  async getGames(sort: GameSortOptions = { launchedAt: -1 }, limit: number, skip: number) {
    return await this.gameModel
      .find()
      .sort(sort)
      .limit(limit)
      .skip(skip);
  }

  async getPlayerGames(playerId: string, sort: GameSortOptions = { launchedAt: -1 }, limit: number = 10, skip: number = 0) {
    return await this.gameModel
      .find({ players: playerId })
      .sort(sort)
      .limit(limit)
      .skip(skip);
  }

  async getPlayerGameCount(playerId: string, options: GetPlayerGameCountOptions = { }) {
    const defaultOptions: GetPlayerGameCountOptions = { endedOnly: false };
    const _options = { ...defaultOptions, ...options };

    let criteria: any = { players: playerId };
    if (_options.endedOnly) {
      criteria = { ...criteria, state: 'ended' };
    }

    return await this.gameModel.countDocuments(criteria);
  }

  async getPlayerPlayedClassCount(playerId: string): Promise<{ [gameClass: string]: number }> {
    // fixme refactor this to aggregate
    const allGames = await this.gameModel.find({ players: playerId, state: 'ended' });
    return this.queueConfigService.queueConfig.classes
      .map(cls => cls.name)
      .reduce((prev, gameClass) => {
        prev[gameClass] = allGames
          .filter(g => !!g.slots.find(s => s.playerId === playerId && s.gameClass === gameClass))
          .length;
        return prev;
      }, {});
  }

  async getPlayerActiveGame(playerId: string): Promise<DocumentType<Game>> {
    return await this.gameModel.findOne({
      state: /launching|started/,
      slots: {
        $elemMatch: {
          status: /active|waiting for substitute/,
          playerId,
        },
      },
    });
  }

  async create(queueSlots: QueueSlot[], map: string, friends: string[][] = []): Promise<DocumentType<Game>> {
    if (!queueSlots.every(slot => !!slot.playerId)) {
      throw new Error('queue not full');
    }

    const players: PlayerSlot[] = await Promise.all(queueSlots.map(slot => this.queueSlotToPlayerSlot(slot)));
    const assignedSkills = players.reduce((prev, curr) => { prev[curr.playerId] = curr.skill; return prev; }, { });
    const slots = pickTeams(players, this.queueConfigService.queueConfig.classes.map(cls => cls.name), { friends });
    const gameNo = await this.getNextGameNumber();

    const game = await this.gameModel.create({
      number: gameNo,
      map,
      teams: {
        0: 'RED',
        1: 'BLU',
      },
      slots,
      players: queueSlots.map(s => s.playerId),
      assignedSkills,
    });

    this.logger.debug(`game #${game.number} created`);
    this.gamesGateway.emitGameCreated(game);
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
      { $match: { state: 'ended' } },
      { $unwind: '$players' },
      { $group: { _id: '$players', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { player: '$_id', count: 1, _id: 0 } },
    ]);
  }

  async getMostActiveMedics() {
    return this.gameModel.aggregate([
      { $match: { state: 'ended' } },
      { $unwind: '$slots' },
      { $match: { 'slots.gameClass': 'medic' } },
      { $group: { _id: '$slots.playerId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { player: '$_id', count: 1, _id: 0 } },
    ]);
  }

  async getGamesWithSubstitutionRequests(): Promise<Array<DocumentType<Game>>> {
    return this.gameModel
      .find({
        'state': { $in: ['launching', 'started'] },
        'slots.status': 'waiting for substitute',
      });
  }

  async getOrphanedGames(): Promise<Array<DocumentType<Game>>> {
    return this.gameModel
      .find({
        state: 'launching',
        gameServer: { $exists: false },
      });
  }

  private async queueSlotToPlayerSlot(queueSlot: QueueSlot): Promise<PlayerSlot> {
    const { playerId, gameClass } = queueSlot;
    const player = await this.playersService.getById(playerId);
    if (!player) {
      throw new Error(`no such player (${playerId})`);
    }

    const skill = await this.playerSkillService.getPlayerSkill(playerId);
    if (skill) {
      const skillForClass = skill.skill.get(gameClass);
      return { playerId, gameClass, skill: skillForClass };
    } else {
      return { playerId, gameClass, skill: 1 };
    }
  }

  private async getNextGameNumber(): Promise<number> {
    const latestGame = await this.gameModel.findOne({}, {}, { sort: { launchedAt: -1 }});
    if (latestGame) {
      return latestGame.number + 1;
    } else {
      return 1;
    }
  }

}
