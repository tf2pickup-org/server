import { Test, TestingModule } from '@nestjs/testing';
import { GamesService } from './games.service';
import { TypegooseModule, getModelToken } from 'nestjs-typegoose';
import { PlayersService } from '@/players/services/players.service';
import { PlayerSkillService } from '@/players/services/player-skill.service';
import { QueueConfigService } from '@/queue/services/queue-config.service';
import { Player } from '@/players/models/player';
import { PlayerSkill } from '@/players/models/player-skill';
import { QueueSlot } from '@/queue/queue-slot';
import { typegooseTestingModule } from '@/utils/testing-typegoose-module';
import { Game } from '../models/game';
import { GameRunnerManagerService } from './game-runner-manager.service';
import { ReturnModelType } from '@typegoose/typegoose';
import { Subject } from 'rxjs';

class PlayersServiceStub {
  player: Player = {
    id: 'FAKE_PLAYER_ID',
    steamId: 'FAKE_STEAM_ID',
    name: 'FAKE_PLAYER_NAME',
    hasAcceptedRules: true,
  };

  async getById(playerId: string) {
    return new Promise(resolve => resolve({ ...this.player, _id: playerId }));
  }
}

class PlayerSkillServiceStub {
  playerSkill: PlayerSkill = {
    skill: new Map([['scout', 1], ['soldier', 2], ['demoman', 3], ['medic', 4]]),
  };

  async getPlayerSkill(playerId: string) {
    return new Promise(resolve => resolve({ ...this.playerSkill, player: playerId }));
  }
}

class QueueConfigServiceStub {
  queueConfig = {
    classes: [
      { name: 'scout', count: 2 },
      { name: 'soldier', count: 2 },
      { name: 'demoman', count: 1 },
      { name: 'medic', count: 1 },
    ],
    teamCount: 2,
    maps: ['fake_map_1', 'fake_map_2'],
    readyUpTimeout: 1000,
    queueReadyTimeout: 2000,
  };
}

class GameRunnerStub {
  constructor(public gameId: string) { }
  gameInitialized = new Subject<void>();
  gameFinished = new Subject<void>();
  gameUpdated = new Subject<void>();
  gameServer = null;
  game = null;
  initialize() { }
}

class GameRunnerManagerServiceStub {
  createGameRunner(gameId: string) { return new GameRunnerStub(gameId); }
}

describe('GamesService', () => {
  let service: GamesService;
  let gameModel: ReturnModelType<typeof Game>;
  let gameRunnerManagerService: GameRunnerManagerServiceStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        typegooseTestingModule(),
        TypegooseModule.forFeature([Game]),
      ],
      providers: [
        GamesService,
        { provide: PlayersService, useClass: PlayersServiceStub },
        { provide: PlayerSkillService, useClass: PlayerSkillServiceStub },
        { provide: QueueConfigService, useClass: QueueConfigServiceStub },
        { provide: GameRunnerManagerService, useClass: GameRunnerManagerServiceStub },
      ],
    }).compile();

    service = module.get<GamesService>(GamesService);
    gameModel = module.get(getModelToken('Game'));
    gameRunnerManagerService = module.get(GameRunnerManagerService);
  });

  afterEach(async () => await gameModel.deleteMany({ }));

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#onModuleInit()', () => {
    it('should resurrect game runners', async () => {
      const game = await gameModel.create({ number: 1, map: 'cp_badlands', state: 'launching' });
      const spy = spyOn(gameRunnerManagerService, 'createGameRunner').and.callThrough();
      await service.onModuleInit();
      expect(spy).toHaveBeenCalledWith(game.id);
    });
  });

  describe('#getGameCount()', () => {
    it('should return document count', async () => {
      const spy = spyOn(gameModel, 'estimatedDocumentCount').and.callThrough();
      const ret = await service.getGameCount();
      expect(spy).toHaveBeenCalled();
      expect(ret).toEqual(0);
    });
  });

  describe('#getById()', () => {
    it('should get the game by its id', async () => {
      const game = await gameModel.create({ number: 1, map: 'cp_badlands' });
      const ret = await service.getById(game.id);
      expect(ret.toJSON()).toEqual(game.toJSON());
    });
  });

  describe('#getRunningGames()', () => {
    it('should get only running games', async () => {
      const launchingGame = await gameModel.create({ number: 1, map: 'cp_badlands', state: 'launching' });
      const runningGame = await gameModel.create({ number: 2, map: 'cp_badlands', state: 'started' });
      const endedGame = await gameModel.create({ number: 3, map: 'cp_badlands', state: 'ended' });

      const ret = await service.getRunningGames();
      expect(ret.length).toEqual(2);
      expect(JSON.stringify(ret)).toEqual(JSON.stringify([ launchingGame, runningGame ]));
    });
  });
});
