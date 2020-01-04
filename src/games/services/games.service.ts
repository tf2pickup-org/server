import { Injectable, Logger, Inject, forwardRef, OnModuleInit } from '@nestjs/common';
import { InjectModel } from 'nestjs-typegoose';
import { ReturnModelType, DocumentType } from '@typegoose/typegoose';
import { Game } from '../models/game';
import { QueueSlot } from '@/queue/queue-slot';
import { PlayerSlot, pickTeams } from '../utils/pick-teams';
import { PlayersService } from '@/players/services/players.service';
import { PlayerSkillService } from '@/players/services/player-skill.service';
import { QueueConfigService } from '@/queue/services/queue-config.service';
import { Subject } from 'rxjs';
import { extractFriends } from '../utils/extract-friends';
import { GameRunnerManagerService } from './game-runner-manager.service';
import { takeUntil } from 'rxjs/operators';
import { GamePlayer } from '../models/game-player';
import { PlayerBansService } from '@/players/services/player-bans.service';

interface GameSortOptions {
  launchedAt: 1 | -1;
}

interface GetPlayerGameCountOptions {
  endedOnly?: boolean;
}

@Injectable()
export class GamesService implements OnModuleInit {

  private logger = new Logger(GamesService.name);
  private _gameCreated = new Subject<Game>(); // todo pass only game id
  private _gameUpdated = new Subject<Game>();

  get gameCreated() {
    return this._gameCreated.asObservable();
  }

  get gameUpdated() {
    return this._gameUpdated.asObservable();
  }

  constructor(
    @InjectModel(Game) private gameModel: ReturnModelType<typeof Game>,
    @Inject(forwardRef(() => PlayersService)) private playersService: PlayersService,
    private playerSkillService: PlayerSkillService,
    private queueConfigService: QueueConfigService,
    @Inject(forwardRef(() => GameRunnerManagerService)) private gameRunnerManagerService: GameRunnerManagerService,
    private playerBansService: PlayerBansService,
  ) { }

  async onModuleInit() {
    const runningGames = await this.getRunningGames();
    runningGames.forEach(async game => {
      const gameRunner = this.gameRunnerManagerService.createGameRunner(game.id);
      await gameRunner.initialize();

      gameRunner.gameUpdated.pipe(
        takeUntil(gameRunner.gameFinished),
      ).subscribe(() => this._gameUpdated.next(gameRunner.game));
    });
  }

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
    return await this.gameModel.findOne({ state: /launching|started/, players: playerId });
  }

  async create(queueSlots: QueueSlot[], map: string): Promise<DocumentType<Game>> {
    if (!queueSlots.every(slot => !!slot.playerId)) {
      throw new Error('queue not full');
    }

    const players: PlayerSlot[] = await Promise.all(queueSlots.map(slot => this.queueSlotToPlayerSlot(slot)));
    const assignedSkills = players.reduce((prev, curr) => { prev[curr.playerId] = curr.skill; return prev; }, { });
    const friends = extractFriends(queueSlots);
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

    this._gameCreated.next(game);
    return game;
  }

  async launch(gameId: string) {
    const gameRunner = this.gameRunnerManagerService.createGameRunner(gameId);
    await gameRunner.initialize();

    gameRunner.gameUpdated.pipe(
      takeUntil(gameRunner.gameFinished),
    ).subscribe(() => this._gameUpdated.next(gameRunner.game));

    await gameRunner.launch();
  }

  // fixme rename
  async reinitialize(gameId: string) {
    const gameRunner = this.gameRunnerManagerService.findGameRunnerByGameId(gameId);
    if (!gameRunner) {
      throw new Error('no such game');
    }

    await gameRunner.reconfigure();
  }

  async forceEnd(gameId: string) {
    const gameRunner = this.gameRunnerManagerService.findGameRunnerByGameId(gameId);
    if (!gameRunner) {
      throw new Error('no such game');
    }

    await gameRunner.forceEnd();
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

  async substitutePlayer(gameId: string, playerId: string) {
    const { game, slot } = await this.findPlayerSlot(gameId, playerId);

    if (slot.status === 'replaced') {
      throw new Error('this player has already been replaced');
    }

    if (slot.status === 'waiting for substitute') {
      return;
    }

    const player = await this.playersService.getById(playerId);
    this.logger.verbose(`player ${player.name} taking part in game #${game.number} is marked as 'waiting for substitute'`);

    slot.status = 'waiting for substitute';
    await game.save();
    this._gameUpdated.next(game);
  }

  async cancelSubstitutionRequest(gameId: string, playerId: string) {
    const { game, slot } = await this.findPlayerSlot(gameId, playerId);

    if (slot.status === 'replaced') {
      throw new Error('this player has already been replaced');
    }

    if (slot.status === 'active') {
      return;
    }

    const player = await this.playersService.getById(playerId);
    this.logger.verbose(`player ${player.name} taking part in game #${game.number} is marked as 'active'`);

    slot.status = 'active';
    await game.save();
    this._gameUpdated.next(game);
  }

  async replacePlayer(gameId: string, replaceeId: string, replacementId: string) {
    if ((await this.playerBansService.getPlayerActiveBans(replacementId)).length > 0) {
      throw new Error('player is banned');
    }

    const { game, slot } = await this.findPlayerSlot(gameId, replaceeId);

    if (slot.status === 'active') {
      throw new Error('the replacee is marked as active');
    }

    if (slot.status === 'replaced') {
      throw new Error('this player has already been replaced');
    }

    const replacement = await this.playersService.getById(replacementId);

    if (replaceeId === replacementId) {
      slot.status = 'active';
      await game.save();
      this._gameUpdated.next(game);
      return;
    }

    // create new slot of the replacement player
    const replacementSlot: GamePlayer = {
      playerId: replacementId,
      teamId: slot.teamId,
      gameClass: slot.gameClass,
      status: 'active',
      connectionStatus: 'offline',
    };

    game.slots.push(replacementSlot);
    game.players.push(replacement);

    // update replacee
    slot.status = 'replaced';

    await game.save();
    this._gameUpdated.next(game);
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

  private async findPlayerSlot(gameId: string, playerId: string) {
    const game = await this.getById(gameId);
    if (!game) {
      throw new Error('no such game');
    }

    const slot = game.slots.find(s => s.playerId === playerId);
    if (!slot) {
      throw new Error('no such player');
    }

    return { game, slot };
  }
}
