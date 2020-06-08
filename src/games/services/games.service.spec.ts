import { Test, TestingModule } from '@nestjs/testing';
import { GamesService } from './games.service';
import { TypegooseModule, getModelToken } from 'nestjs-typegoose';
import { PlayersService } from '@/players/services/players.service';
import { PlayerSkillService } from '@/players/services/player-skill.service';
import { Player } from '@/players/models/player';
import { PlayerSkill } from '@/players/models/player-skill';
import { typegooseTestingModule } from '@/utils/testing-typegoose-module';
import { Game } from '../models/game';
import { ReturnModelType } from '@typegoose/typegoose';
import { ObjectId } from 'mongodb';
import { QueueSlot } from '@/queue/queue-slot';
import { GameLauncherService } from './game-launcher.service';
import { QueueConfigService } from '@/queue/services/queue-config.service';
import { GamesGateway } from '../gateways/games.gateway';
import { cloneDeep } from 'lodash';
import { MongoMemoryServer } from 'mongodb-memory-server';

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

class GameLauncherServiceStub {
  launch(gameId: string) { return null; }
}

class GamesGatewayStub {
  emitGameCreated(game: any) { return null; }
  emitGameUpdated(game: any) { return null; }
}

describe('GamesService', () => {
  let service: GamesService;
  let mongod: MongoMemoryServer;
  let gameModel: ReturnModelType<typeof Game>;
  let gameLauncherService: GameLauncherServiceStub;

  beforeAll(() => mongod = new MongoMemoryServer());
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        typegooseTestingModule(mongod),
        TypegooseModule.forFeature([Game]),
      ],
      providers: [
        GamesService,
        { provide: PlayersService, useClass: PlayersServiceStub },
        { provide: PlayerSkillService, useClass: PlayerSkillServiceStub },
        { provide: QueueConfigService, useClass: QueueConfigServiceStub },
        { provide: GameLauncherService, useClass: GameLauncherServiceStub },
        { provide: GamesGateway, useClass: GamesGatewayStub },
      ],
    }).compile();

    service = module.get<GamesService>(GamesService);
    gameModel = module.get(getModelToken('Game'));
    gameLauncherService = module.get(GameLauncherService);
  });

  beforeEach(async () => await gameModel.deleteMany({ }));
  afterEach(async () => await gameModel.deleteMany({ }));

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#getGameCount()', () => {
    it('should return document count', async () => {
      const spy = jest.spyOn(gameModel, 'estimatedDocumentCount');
      const ret = await service.getGameCount();
      expect(spy).toHaveBeenCalled();
      expect(ret).toEqual(0);
    });
  });

  describe('#getById()', () => {
    it('should get the game by its id', async () => {
      const game = await gameModel.create({ number: 1, map: 'cp_badlands' } as any);
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

  describe('#findByAssignedGameServer()', () => {
    it('should get the last game', async () => {
      const now = new Date();
      const hourAgo = new Date();
      hourAgo.setHours(hourAgo.getHours() - 1);
      const serverId = new ObjectId();

      const game = await gameModel.create({ number: 2, map: 'cp_process_final', state: 'started', gameServer: serverId });

      const ret = await service.findByAssignedGameServer(serverId.toString());
      expect(ret.toJSON()).toEqual(game.toJSON());
    });
  });

  describe('#getPlayerActiveGame()', () => {
    it('should return a game if the player is active', async () => {
      const playerId = new ObjectId();
      const game = await gameModel.create({
        number: 1,
        map: 'cp_badlands',
        state: 'started',
        players: [ playerId ],
        slots: [
          {
            playerId: playerId.toString(),
            status: 'active',
            gameClass: 'soldier',
            teamId: '1',
          }
        ],
      });
      const ret = await service.getPlayerActiveGame(playerId.toString());
      expect(ret).toBeTruthy();
      expect(ret.toJSON()).toEqual(game.toJSON());
    });

    it('should return a game if the player is waiting for a substitute', async () => {
      const playerId = new ObjectId();
      const game = await gameModel.create({
        number: 1,
        map: 'cp_badlands',
        state: 'started',
        players: [ playerId ],
        slots: [
          {
            playerId: playerId.toString(),
            status: 'waiting for substitute',
            gameClass: 'soldier',
            teamId: '1',
          },
        ],
      });
      const ret = await service.getPlayerActiveGame(playerId.toString());
      expect(ret).toBeTruthy();
      expect(ret.toJSON()).toEqual(game.toJSON());
    });

    it('should not return a game if the player has been replaced', async () => {
      const playerId = new ObjectId();
      const playerId2 = new ObjectId();
      await  gameModel.create({
        number: 1,
        map: 'cp_badlands',
        state: 'started',
        players: [ playerId ],
        slots: [
          {
            playerId: playerId.toString(),
            status: 'replaced',
            gameClass: 'soldier',
            teamId: '1',
          },
          {
            playerId: playerId2.toString(),
            status: 'active',
            gameClass: 'soldier',
            teamId: '1',
          },
        ],
      });

      const ret = await service.getPlayerActiveGame(playerId.toString());
      expect(ret).toBeNull();
    });

    it('should not return a game if a game is no longer active', async () => {
      const playerId = new ObjectId();
      const game = await  gameModel.create({
        number: 1,
        map: 'cp_badlands',
        state: 'ended',
        players: [ playerId ],
        slots: [
          {
            playerId: playerId.toString(),
            status: 'active',
            gameClass: 'soldier',
            teamId: '1',
          },
        ],
      });

      const ret = await service.getPlayerActiveGame(playerId.toString());
      expect(ret).toBeNull();
    });
  });

  describe('#create()', () => {
    const slots: QueueSlot[] = [
      { id: 0, gameClass: 'scout', playerId: new ObjectId(), ready: true, friend: null },
      { id: 1, gameClass: 'scout', playerId: new ObjectId(), ready: true, friend: null },
      { id: 2, gameClass: 'scout', playerId: new ObjectId(), ready: true, friend: null },
      { id: 3, gameClass: 'scout', playerId: new ObjectId(), ready: true, friend: null },
      { id: 4, gameClass: 'soldier', playerId: new ObjectId(), ready: true, friend: null },
      { id: 5, gameClass: 'soldier', playerId: new ObjectId(), ready: true, friend: null },
      { id: 6, gameClass: 'soldier', playerId: new ObjectId(), ready: true, friend: null },
      { id: 7, gameClass: 'soldier', playerId: new ObjectId(), ready: true, friend: null },
      { id: 8, gameClass: 'demoman', playerId: new ObjectId(), ready: true, friend: null },
      { id: 9, gameClass: 'demoman', playerId: new ObjectId(), ready: true, friend: null },
      { id: 10, gameClass: 'medic', playerId: new ObjectId(), ready: true, friend: null },
      { id: 11, gameClass: 'medic', playerId: new ObjectId(), ready: true, friend: null },
    ] as any;

    beforeEach(async () => gameModel.deleteMany({ }));

    it('should fail if the queue is not full', async () => {
      const tSlots = cloneDeep(slots);
      tSlots[3].ready = false;
      tSlots[3].playerId = null;
      await expect(service.create(tSlots, 'cp_fake')).rejects.toThrow('queue not full');
    });

    it('should create a game', async () => {
      const game = await service.create(slots, 'cp_fake');
      expect(game.toObject()).toEqual(jasmine.objectContaining({
        number: 1,
        map: 'cp_fake',
        teams: new Map([ [ '0', 'RED' ], [ '1', 'BLU' ] ]),
        slots: jasmine.any(Array),
        players: slots.map(s => s.playerId),
        assignedSkills: jasmine.any(Object),
        state: 'launching',
        launchedAt: jasmine.any(Date),
      }));
    });
  });

  describe('#launch()', () => {
    it('should launch the game', async () => {
      const spy = jest.spyOn(gameLauncherService, 'launch');
      await service.launch('FAKE_GAME_ID');
      expect(spy).toHaveBeenCalledWith('FAKE_GAME_ID');
    });
  });

  describe('#getGamesWithSubstitutionRequests()', () => {
    it('should return games with substitution requests', async () => {
      const player1 = new ObjectId();
      const player2 = new ObjectId();
      const game = await gameModel.create({
        number: 1,
        players: [ player1, player2 ],
        slots: [
          {
            playerId: player1.toString(),
            teamId: '1',
            gameClass: 'scout',
            status: 'waiting for substitute',
          },
          {
            playerId: player2.toString(),
            teamId: '2',
            gameClass: 'scout',
            status: 'active',
          },
        ],
        map: 'cp_badlands',
        state: 'launching',
      });

      const ret = await service.getGamesWithSubstitutionRequests();
      expect(ret).toEqual([
        jasmine.objectContaining({ id: game.id }),
      ]);
    });
  });

  describe('#getOrphanedGames()', () => {
    beforeEach(async () => {
      const player = new ObjectId();
      await gameModel.create({
        number: 1,
        players: [ player ],
        slots: [],
        map: 'cp_badlands',
        state: 'launching',
      });

      const gameServer = new ObjectId();
      await gameModel.create({
        number: 2,
        players: [ player ],
        slots: [],
        map: 'cp_badlands',
        state: 'launching',
        gameServer,
      });
    });

    it('should return games that do not have the gameServer property set', async () => {
      const ret = await service.getOrphanedGames();
      expect(ret).toBeTruthy();
      expect(ret.length).toBe(1);
      expect(ret[0].number).toBe(1);
    });
  });
});
