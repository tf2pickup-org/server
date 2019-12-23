import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from 'nestjs-typegoose';
import { ReturnModelType, DocumentType } from '@typegoose/typegoose';
import { Game } from '../models/game';
import { QueueSlot } from '@/queue/queue-slot';
import { PlayerSlot, pickTeams } from '../utils/pick-teams';
import { PlayersService } from '@/players/services/players.service';
import { PlayerSkillService } from '@/players/services/player-skill.service';
import { QueueConfigService } from '@/queue/services/queue-config.service';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { GameServer } from '@/game-servers/models/game-server';
import { ConfigService } from '@/config/config.service';
import { Subject } from 'rxjs';

interface GameSortOptions {
  launchedAt: 1 | -1;
}

interface GetPlayerGameCountOptions {
  endedOnly?: boolean;
}

@Injectable()
export class GamesService {

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
    private gameServersService: GameServersService,
    private configService: ConfigService,
  ) { }

  async getGameCount(): Promise<number> {
    return await this.gameModel.estimatedDocumentCount();
  }

  async getById(gameId: string): Promise<DocumentType<Game>> {
    return await this.gameModel.findById(gameId);
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
    const slots = pickTeams(players, this.queueConfigService.queueConfig.classes.map(cls => cls.name));
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
    const game = await this.getById(gameId);
    if (!game) {
      throw new Error('no such game');
    }

    if (game.state !== 'launching') {
      throw new Error('game already launched');
    }

    const server = await this.gameServersService.findFreeGameServer();
    if (server) {
      await this.assignGameServer(game, server);
      await this.resolveMumbleUrl(game, server);
    } else {
      this.logger.warn(`no free servers for game #${game.number}`);

      // fixme
      setTimeout(() => this.launch(game.id), 10 * 1000); // try again in 10 seconds
    }
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

  private async assignGameServer(game: DocumentType<Game>, server: DocumentType<GameServer>) {
    this.logger.log(`using server ${server.name} for game #${game.number}`);
    await this.gameServersService.takeServer(server.id);
    game.gameServer = server;
    await game.save();
    this._gameUpdated.next(game);
  }

  private async resolveMumbleUrl(game: DocumentType<Game>, server: GameServer) {
    const mumbleUrl =
      `mumble://${this.configService.mumbleServerUrl}/${this.configService.mumbleChannelName}/${server.mumbleChannelName}`;
    game.mumbleUrl = mumbleUrl;
    await game.save();
    this._gameUpdated.next(game);
  }

}
