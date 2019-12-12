import { Test, TestingModule } from '@nestjs/testing';
import { QueueService } from './queue.service';
import { PlayersService } from '@/players/players.service';
import { Player } from '@/players/models/player';
import { QueueConfigService } from './queue-config.service';

class PlayersServiceStub {

  player: Player = {
    _id: 'FAKE_PLAYER_ID',
    name: 'FAKE_PLAYER_NAME',
    steamId: 'FAKE_STEAM_ID',
    joinedAt: new Date(),
    avatarUrl: 'FAKE_AVATAR_URL',
    hasAcceptedRules: true,
    etf2lProfileId: 12345,
  };

  async getById() {
    return new Promise(resolve => resolve(this.player));
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

describe('QueueService', () => {
  let service: QueueService;
  let playersService: PlayersServiceStub;
  let queueConfigService: QueueConfigServiceStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        { provide: PlayersService, useClass: PlayersServiceStub },
        { provide: QueueConfigService, useClass: QueueConfigServiceStub },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
    playersService = module.get(PlayersService);
    queueConfigService = module.get(QueueConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should be empty initially', () => {
    // expect(service.state).toEqual('waiting');
    expect(service.slots.length).toBe(12);
    expect(service.slots.every(s => s.playerId === null)).toBe(true);
    expect(service.slots.every(s => s.ready === false)).toBe(true);
    // expect(service.playerCount).toEqual(0);
    // expect(service.readyPlayerCount).toEqual(0);
  });

  describe('#join()', () => {
    xit('should fail if the queue is in launching state', () => {
      // todo
    });

    it('should fail if the given player doesn\'t exist', async () => {
      spyOn(playersService, 'getById').and.returnValue(new Promise(resolve => resolve(null)));
      await expectAsync(service.join(0, 'FAKE_PLAYER_ID')).toBeRejectedWithError('no such player');
    });

    it('should fail when trying to join an ivalid slot', async () => {
      await expectAsync(service.join(1234567, 'FAKE_ID')).toBeRejectedWithError('no such slot');
    });

    it('should fail when trying to take a slot that was already occupied', async () => {
      await service.join(0, 'FAKE_PLAYER_ID');
      await expectAsync(service.join(0, 'FAKE_PLAYER_ID')).toBeRejectedWithError('slot occupied');
    });

    it('should store add the player to the given slot', async () => {
      const slots = await service.join(0, 'FAKE_PLAYER_ID');
      const slot = slots.find(s => s.playerId === 'FAKE_PLAYER_ID');
      expect(slot.playerId).toEqual('FAKE_PLAYER_ID');
    });
  });
});
