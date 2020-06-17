import { Test, TestingModule } from '@nestjs/testing';
import { QueueService } from './queue.service';
import { PlayersService } from '@/players/services/players.service';
import { Player } from '@/players/models/player';
import { QueueConfigService } from './queue-config.service';
import { PlayerBansService } from '@/players/services/player-bans.service';
import { GamesService } from '@/games/services/games.service';
import { OnlinePlayersService } from '@/players/services/online-players.service';
import { Subject } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { QueueGateway } from '../gateways/queue.gateway';
import { QueueSlot } from '../queue-slot';
import { QueueState } from '../queue-state';

class PlayersServiceStub {

  player: Player = {
    id: 'FAKE_PLAYER_ID',
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

class PlayerBansServiceStub {
  banAdded = new Subject<string>();
  getPlayerActiveBans(playerId: string) {
    return new Promise(resolve => resolve([]));
  }
}

class GamesServiceStub {
  getPlayerActiveGame(playerId: string) { return new Promise(resolve => resolve(null)); }
}

class OnlinePlayersServiceStub {
  playerLeft = new Subject<string>();
}

class QueueGatewayStub {
  emitSlotsUpdate(slots: QueueSlot[]) { return null; }
  emitStateUpdate(state: QueueState) { return null; }
}

jest.useFakeTimers();

describe('QueueService', () => {
  let service: QueueService;
  let playersService: PlayersServiceStub;
  let queueConfigService: QueueConfigServiceStub;
  let playerBansService: PlayerBansServiceStub;
  let gamesService: GamesServiceStub;
  let onlinePlayersService: OnlinePlayersServiceStub;
  let queueGateway: QueueGatewayStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        { provide: PlayersService, useClass: PlayersServiceStub },
        { provide: QueueConfigService, useClass: QueueConfigServiceStub },
        { provide: PlayerBansService, useClass: PlayerBansServiceStub },
        { provide: GamesService, useClass: GamesServiceStub },
        { provide: OnlinePlayersService, useClass: OnlinePlayersServiceStub },
        { provide: QueueGateway, useClass: QueueGatewayStub },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
    playersService = module.get(PlayersService);
    queueConfigService = module.get(QueueConfigService);
    playerBansService = module.get(PlayerBansService);
    gamesService = module.get(GamesService);
    onlinePlayersService = module.get(OnlinePlayersService);
    queueGateway = module.get(QueueGateway);
  });

  beforeEach(() => service.onModuleInit());
  afterEach(() => jest.runAllTimers());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should be empty initially', () => {
    expect(service.state).toEqual('waiting');
    expect(service.slots.length).toBe(12);
    expect(service.slots.every(s => s.playerId === null)).toBe(true);
    expect(service.slots.every(s => s.ready === false)).toBe(true);
    expect(service.playerCount).toEqual(0);
    expect(service.readyPlayerCount).toEqual(0);
  });

  describe('#join()', () => {
    it('should fail if the given player doesn\'t exist', async () => {
      spyOn(playersService, 'getById').and.returnValue(new Promise(resolve => resolve(null)));
      await expect(service.join(0, 'FAKE_PLAYER_ID')).rejects.toThrowError('no such player');
    });

    it('should fail if the joining player hasn\'t accepted rules', async () => {
      spyOn(playersService, 'getById').and.returnValue(new Promise(resolve => resolve({ ...playersService.player, hasAcceptedRules: false })));
      await expect(service.join(0, 'FAKE_ID')).rejects.toThrowError('player has not accepted rules');
    });

    it('should fail if the player is banned', async () => {
      spyOn(playerBansService, 'getPlayerActiveBans').and.returnValue(new Promise(resolve => resolve([{}])));
      await expect(service.join(0, 'FAKE_ID')).rejects.toThrowError('player is banned');
    });

    it('should fail if the player is currently playing a game', async () => {
      spyOn(gamesService, 'getPlayerActiveGame').and.returnValue(new Promise(resolve => resolve({ number: 1, state: 'started' })));
      await expect(service.join(0, 'FAKE_ID')).rejects.toThrowError('player involved in a currently active game');
    });

    it('should fail when trying to join an ivalid slot', async () => {
      await expect(service.join(1234567, 'FAKE_ID')).rejects.toThrowError('no such slot');
    });

    it('should fail when trying to take a slot that was already occupied', async () => {
      await service.join(0, 'FAKE_PLAYER_ID');
      await expect(service.join(0, 'FAKE_PLAYER_ID_2')).rejects.toThrowError('slot occupied');
    });

    it('should store add the player to the given slot', async () => {
      const slots = await service.join(0, 'FAKE_PLAYER_ID');
      const slot = slots.find(s => s.playerId === 'FAKE_PLAYER_ID');
      expect(slot.id).toBe(0);
      expect(slot.playerId).toEqual('FAKE_PLAYER_ID');
      expect(service.playerCount).toBe(1);
    });

    it('should remove the player from already taken slot', async () => {
      const oldSlots = await service.join(0, 'FAKE_PLAYER_ID');
      const newSlots = await service.join(1, 'FAKE_PLAYER_ID');
      expect(newSlots.length).toEqual(2);
      expect(newSlots.find(s => s.playerId === 'FAKE_PLAYER_ID')).toBeTruthy();
      expect(oldSlots[0].playerId).toBeNull();
    });

    it('should emit playerJoin', async done => {
      service.playerJoin.subscribe(playerId => {
        expect(playerId).toEqual('FAKE_ID');
        done();
      });

      await service.join(0, 'FAKE_ID');
    });

    it('should ready up immediately when joining as 12th player', async () => {
      for (let i = 0; i < 11; ++i) {
        await service.join(i, `FAKE_ID_${i}`);
      }

      const slots = await service.join(11, 'FAKE_ID');
      expect(slots[0].ready).toEqual(true);

      jest.runAllTimers();
    });

  });

  describe('#leave()', () => {
    beforeEach(async () => {
      await service.join(0, 'FAKE_PLAYER_ID');
    });

    it('should reset the slot', () => {
      const slot = service.leave('FAKE_PLAYER_ID');
      expect(slot.id).toBe(0);
      expect(slot.playerId).toBe(null);
      expect(slot.ready).toBe(false);
    });
  });

  describe('#kick()', () => {
    beforeEach(async () => {
      await service.join(0, 'FAKE_PLAYER_ID');
      const slot = service.getSlotById(0);
      expect(slot.playerId).toBe('FAKE_PLAYER_ID');
    });

    it('should reset the slot', () => {
      service.kick('FAKE_PLAYER_ID');
      const slot = service.getSlotById(0);
      expect(slot.playerId).toBe(null);
      expect(slot.ready).toBe(false);
      expect(service.playerCount).toBe(0);
    });

    it('should be invoked when the player leaves the webpage', () => {
      const slot = service.getSlotById(0);
      expect(slot.playerId).toBe('FAKE_PLAYER_ID');
      onlinePlayersService.playerLeft.next('FAKE_PLAYER_ID');
      expect(slot.playerId).toBe(null);
    });
  });

  describe('#readyUp()', () => {
    it('should fail if the queue is not in ready up state', async () => {
      await service.join(0, 'FAKE_PLAYER_ID');
      expect(() => service.readyUp('FAKE_PLAYER_ID')).toThrowError('queue not ready');
    });
  });
});
