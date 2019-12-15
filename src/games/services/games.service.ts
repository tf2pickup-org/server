import { Injectable, Logger } from '@nestjs/common';
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

interface GameSortOptions {
  launchedAt: 1 | -1;
}

@Injectable()
export class GamesService {

  private logger = new Logger(GamesService.name);

  constructor(
    @InjectModel(Game) private gameModel: ReturnModelType<typeof Game>,
    private playersService: PlayersService,
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

  async getPlayerGames(playerId: string, sort: GameSortOptions = { launchedAt: -1 }, limit: number = 10, skip: number = 0) {
    return await this.gameModel
      .find({ players: playerId })
      .sort(sort)
      .limit(limit)
      .skip(skip);
  }

  async getPlayerGameCount(playerId: string) {
    return await this.gameModel.countDocuments({ players: playerId });
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
  }

  private async resolveMumbleUrl(game: DocumentType<Game>, server: GameServer) {
    const mumbleUrl =
      `mumble://${this.configService.mumbleServerUrl}/${this.configService.mumbleChannelName}/${server.mumbleChannelName}`;
    game.mumbleUrl = mumbleUrl;
    await game.save();
  }

}
