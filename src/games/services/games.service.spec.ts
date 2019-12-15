import { Test, TestingModule } from '@nestjs/testing';
import { GamesService } from './games.service';
import { getModelToken } from 'nestjs-typegoose';
import { PlayersService } from '@/players/services/players.service';
import { PlayerSkillService } from '@/players/services/player-skill.service';
import { QueueConfigService } from '@/queue/services/queue-config.service';
import { Player } from '@/players/models/player';
import { PlayerSkill } from '@/players/models/player-skill';
import { QueueSlot } from '@/queue/queue-slot';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { ConfigService } from '@/config/config.service';

const gameModel = {
  estimatedDocumentCount: async () => new Promise(resolve => resolve(44)),
  find: async (args: any) => new Promise(resolve => resolve(null)),
  findById: async (id: string) => new Promise(resolve => resolve(null)),
  findOne: async (args: any) => new Promise(resolve => resolve(null)),
  create: async (obj: any) => new Promise(resolve => resolve(null)),
  countDocuments: async (obj: any) => new Promise(resolve => resolve(0)),
};

class PlayersServiceStub {
  player: Player = {
    _id: 'FAKE_PLAYER_ID',
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

class GameServersServiceStub {
  gameServer = {
    name: 'FAKE_GAME_SERVER_NAME',
    address: 'melkor.tf',
    port: 27015,
    rconPassword: 'FAKE_RCON_PASSWORD',
    isAvailable: true,
    isOnline: true,
    isFree: true,
    resolvedIpAddresses: [
      '192.168.1.1',
    ],
    mumbleChannelName: 'FAKE_MUMBLE_GAME_CHANNEL',
  };
  findFreeGameServer() { return new Promise(resolve => resolve(this.gameServer)); }
  takeServer(serverId: string) { return null; }
}

class ConfigServiceStub {
  mumbleServerUrl = 'FAKE_MUMBLE_URL';
  mumbleChannelName = 'FAKE_MUMBLE_CHANNEL';
}

describe('GamesService', () => {
  let service: GamesService;
  let queueConfigService: QueueConfigServiceStub;
  let gameServersService: GameServersServiceStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamesService,
        { provide: getModelToken('Game'), useValue: gameModel },
        { provide: PlayersService, useClass: PlayersServiceStub },
        { provide: PlayerSkillService, useClass: PlayerSkillServiceStub },
        { provide: QueueConfigService, useClass: QueueConfigServiceStub },
        { provide: GameServersService, useClass: GameServersServiceStub },
        { provide: ConfigService, useClass: ConfigServiceStub },
      ],
    }).compile();

    service = module.get<GamesService>(GamesService);
    queueConfigService = module.get(QueueConfigService);
    gameServersService = module.get(GameServersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#getGameCount()', () => {
    it('should query model', async () => {
      const spy = spyOn(gameModel, 'estimatedDocumentCount').and.callThrough();
      const ret = await service.getGameCount();
      expect(spy).toHaveBeenCalled();
      expect(ret).toEqual(44);
    });
  });

  describe('#getById()', () => {
    it('should query model', async () => {
      const spy = spyOn(gameModel, 'findById').and.callThrough();
      await service.getById('FAKE_ID');
      expect(spy).toHaveBeenCalledWith('FAKE_ID');
    });
  });

  describe('#getPlayerGames()', () => {
    it('should query model', async () => {
      // tslint:disable-next-line: one-variable-per-declaration
      let sort: any, limit: any, skip: any;

      const findResult = {
        sort: arg => { sort = arg; return findResult; },
        limit: arg => { limit = arg; return findResult; },
        skip: arg => { skip = arg; return findResult; },
      };
      const findSpy = spyOn(gameModel, 'find').and.returnValue(findResult as any);
      await service.getPlayerGames('FAKE_ID', { launchedAt: 1 }, 44, 28);
      expect(sort).toEqual({ launchedAt: 1 });
      expect(limit).toBe(44);
      expect(skip).toBe(28);
      expect(findSpy).toHaveBeenCalledWith({ players: 'FAKE_ID' });
    });
  });

  describe('#getPlayerGameCount()', () => {
    it('should query model', async () => {
      const spy = spyOn(gameModel, 'countDocuments').and.callThrough();
      await service.getPlayerGameCount('FAKE_ID');
      expect(spy).toHaveBeenCalledWith({ players: 'FAKE_ID' });
    });
  });

  describe('#create()', () => {
    const slots: QueueSlot[] = [
      { id: 0, gameClass: 'scout', playerId: 'FAKE_PLAYER_ID_0', ready: true, friend: null },
      { id: 1, gameClass: 'scout', playerId: 'FAKE_PLAYER_ID_1', ready: true, friend: null },
      { id: 2, gameClass: 'scout', playerId: 'FAKE_PLAYER_ID_2', ready: true, friend: null },
      { id: 3, gameClass: 'scout', playerId: 'FAKE_PLAYER_ID_3', ready: true, friend: null },
      { id: 4, gameClass: 'soldier', playerId: 'FAKE_PLAYER_ID_4', ready: true, friend: null },
      { id: 5, gameClass: 'soldier', playerId: 'FAKE_PLAYER_ID_5', ready: true, friend: null },
      { id: 6, gameClass: 'soldier', playerId: 'FAKE_PLAYER_ID_6', ready: true, friend: null },
      { id: 7, gameClass: 'soldier', playerId: 'FAKE_PLAYER_ID_7', ready: true, friend: null },
      { id: 8, gameClass: 'demoman', playerId: 'FAKE_PLAYER_ID_8', ready: true, friend: null },
      { id: 9, gameClass: 'demoman', playerId: 'FAKE_PLAYER_ID_9', ready: true, friend: null },
      { id: 10, gameClass: 'medic', playerId: 'FAKE_PLAYER_ID_10', ready: true, friend: null },
      { id: 11, gameClass: 'medic', playerId: 'FAKE_PLAYER_ID_11', ready: true, friend: null },
    ];

    it('should fail if the queue is not full', async () => {
      slots[3].ready = false;
      expectAsync(service.create(slots, 'cp_fake')).toBeRejectedWithError('queue not full');
    });

    it('should create a game', async () => {
      const spy = spyOn(gameModel, 'create').and.callThrough();
      await service.create(slots, 'cp_fake');
      expect(spy).toHaveBeenCalledWith({
        number: 1,
        map: 'cp_fake',
        teams: {
          0: 'RED',
          1: 'BLU',
        },
        slots: jasmine.any(Array),
        players: [ 'FAKE_PLAYER_ID_0', 'FAKE_PLAYER_ID_1', 'FAKE_PLAYER_ID_2', 'FAKE_PLAYER_ID_3', 'FAKE_PLAYER_ID_4', 'FAKE_PLAYER_ID_5',
          'FAKE_PLAYER_ID_6', 'FAKE_PLAYER_ID_7', 'FAKE_PLAYER_ID_8', 'FAKE_PLAYER_ID_9', 'FAKE_PLAYER_ID_10', 'FAKE_PLAYER_ID_11' ],
        assignedSkills: jasmine.any(Object),
      });
    });
  });

  describe('#launch()', () => {
    it('should fail when trying to launch an non-existent game', async () => {
      spyOn(gameModel, 'findById').and.returnValue(new Promise(resolve => resolve(null)));
      await expectAsync(service.launch('FAKE_ID')).toBeRejectedWithError('no such game');
    });

    it('should fail when trying to launch agame that has already been launched', async () => {
      spyOn(gameModel, 'findById').and.returnValue(new Promise(resolve => resolve({ state: 'started' })));
      await expectAsync(service.launch('FAKE_ID')).toBeRejectedWithError('game already launched');
    });

    it('should take the first free server', async () => {
      const game: any = {
        state: 'launching',
        save: () => null,
      };
      spyOn(gameModel, 'findById').and.returnValue(new  Promise(resolve => resolve(game)));
      const findFreeGameServerSpy = spyOn(gameServersService, 'findFreeGameServer').and.callThrough();
      const takeServerSpy = spyOn(gameServersService, 'takeServer').and.callThrough();
      await service.launch('FAKE_GAME_ID');
      expect(findFreeGameServerSpy).toHaveBeenCalled();
      expect(takeServerSpy).toHaveBeenCalled();
      expect(game.mumbleUrl).toEqual('mumble://FAKE_MUMBLE_URL/FAKE_MUMBLE_CHANNEL/FAKE_MUMBLE_GAME_CHANNEL');
    });
  });
});
