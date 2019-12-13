import { Test, TestingModule } from '@nestjs/testing';
import { GamesService } from './games.service';
import { getModelToken } from 'nestjs-typegoose';
import { PlayersService } from '@/players/services/players.service';
import { PlayerSkillService } from '@/players/services/player-skill.service';
import { QueueConfigService } from '@/queue/services/queue-config.service';
import { Player } from '@/players/models/player';
import { PlayerSkill } from '@/players/models/player-skill';
import { QueueSlot } from '@/queue/queue-slot';

const gameModel = {
  findById: async (id: string) => new Promise(resolve => resolve(null)),
  findOne: async (args: any) => new Promise(resolve => resolve(null)),
  create: async (obj: any) => new Promise(resolve => resolve(null)),
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

describe('GamesService', () => {
  let service: GamesService;
  let queueConfigService: QueueConfigServiceStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamesService,
        { provide: getModelToken('Game'), useValue: gameModel },
        { provide: PlayersService, useClass: PlayersServiceStub },
        { provide: PlayerSkillService, useClass: PlayerSkillServiceStub },
        { provide: QueueConfigService, useClass: QueueConfigServiceStub },
      ],
    }).compile();

    service = module.get<GamesService>(GamesService);
    queueConfigService = module.get(QueueConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#getById()', () => {
    it('should query model', async () => {
      const spy = spyOn(gameModel, 'findById').and.callThrough();
      await service.getById('FAKE_ID');
      expect(spy).toHaveBeenCalledWith('FAKE_ID');
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
});
