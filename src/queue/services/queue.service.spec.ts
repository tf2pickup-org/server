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
import { MongoMemoryServer } from 'mongodb-memory-server';
import { typegooseTestingModule } from '@/utils/testing-typegoose-module';
import { TypegooseModule } from 'nestjs-typegoose';
import { ObjectId } from 'mongodb';
import { DocumentType } from '@typegoose/typegoose';

jest.mock('@/players/services/players.service');

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

class ConfigServiceStub {
  get(key: string) {
    switch (key) {
      case 'queue.readyUpTimeout':
        return 40000;

      case 'queue.readyStateTimeout':
        return 60000;
    }
  }
}

class QueueGatewayStub {
  emitSlotsUpdate(slots: QueueSlot[]) { return null; }
  emitStateUpdate(state: QueueState) { return null; }
}

jest.useFakeTimers();

describe('QueueService', () => {
  let service: QueueService;
  let mongod: MongoMemoryServer;
  let playersService: PlayersService;
  let queueConfigService: QueueConfigServiceStub;
  let playerBansService: PlayerBansServiceStub;
  let gamesService: GamesServiceStub;
  let onlinePlayersService: OnlinePlayersServiceStub;
  let queueGateway: QueueGatewayStub;
  let mockPlayer: DocumentType<Player>;

  beforeAll(() => mongod = new MongoMemoryServer());
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        typegooseTestingModule(mongod),
        TypegooseModule.forFeature([ Player ]),
      ],
      providers: [
        QueueService,
        PlayersService,
        { provide: QueueConfigService, useClass: QueueConfigServiceStub },
        { provide: PlayerBansService, useClass: PlayerBansServiceStub },
        { provide: GamesService, useClass: GamesServiceStub },
        { provide: OnlinePlayersService, useClass: OnlinePlayersServiceStub },
        { provide: ConfigService, useClass: ConfigServiceStub },
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

  beforeEach(async () => {
    // @ts-expect-error
    mockPlayer = await playersService._createOne();
  });

  afterEach(async () => {
    // @ts-expect-error
    await playersService._reset();
  });

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
    describe('when the player does not exist', () => {
      it('should fail', async () => {
        await expect(service.join(0, new ObjectId())).rejects.toThrowError('no such player');
      });
    });

    describe('if the joining player has not accepted rules', async () => {
      beforeEach(async () => {
        mockPlayer.hasAcceptedRules = false;
        await mockPlayer.save();
      });

      it('should fail', async () => {
        await expect(service.join(0, mockPlayer.id)).rejects.toThrowError('player has not accepted rules');
      });
    });

    it('should fail if the player is banned', async () => {
      // todo mock PlayerBansService
      spyOn(playerBansService, 'getPlayerActiveBans').and.returnValue(new Promise(resolve => resolve([{}])));
      await expect(service.join(0, mockPlayer.id)).rejects.toThrowError('player is banned');
    });

    it('should fail if the player is currently playing a game', async () => {
      // todo mock GamesService
      spyOn(gamesService, 'getPlayerActiveGame').and.returnValue(new Promise(resolve => resolve({ number: 1, state: 'started' })));
      await expect(service.join(0, mockPlayer.id)).rejects.toThrowError('player involved in a currently active game');
    });

    it('should fail when trying to join an ivalid slot', async () => {
      await expect(service.join(1234567, mockPlayer.id)).rejects.toThrowError('no such slot');
    });

    describe('when the slot is already occupied', () => {
      let anotherPlayer: DocumentType<Player>;

      beforeEach(async () => {
        // @ts-expect-error
        anotherPlayer = await playersService._createOne();
        await service.join(0, anotherPlayer.id);
      });

      it('should fail', async () => {
        await expect(service.join(0, mockPlayer.id)).rejects.toThrowError('slot occupied');
      });
    });

    it('should save the player at the given slot', async () => {
      const slots = await service.join(0, mockPlayer.id);
      const slot = slots.find(s => s.playerId.equals(mockPlayer.id));
      expect(slot.id).toBe(0);
      expect(slot.playerId).toEqual('FAKE_PLAYER_ID');
      expect(service.playerCount).toBe(1);
    });

    it('should remove the player from already taken slot', async () => {
      const oldSlots = await service.join(0, mockPlayer.id);
      const newSlots = await service.join(1, mockPlayer.id);
      expect(newSlots.length).toEqual(2);
      expect(newSlots.find(s => s.playerId.equals(mockPlayer.id))).toBeTruthy();
      expect(oldSlots[0].playerId).toBeNull();
    });

    it('should emit playerJoin', async done => {
      service.playerJoin.subscribe(playerId => {
        expect(playerId).toEqual(mockPlayer.id);
        done();
      });

      await service.join(0, mockPlayer.id);
    });

    it('should ready up immediately when joining as 12th player', async () => {
      for (let i = 0; i < 11; ++i) {
        // @ts-expect-error
        const player = await service._createOne();
        await service.join(i, player.id);
      }

      const slots = await service.join(11, mockPlayer.id);
      expect(slots[0].ready).toEqual(true);

      jest.runAllTimers();
    });

  });

  describe('#leave()', () => {
    beforeEach(async () => {
      await service.join(0, mockPlayer.id);
    });

    it('should reset the slot', () => {
      const slot = service.leave(mockPlayer.id);
      expect(slot.id).toBe(0);
      expect(slot.playerId).toBe(null);
      expect(slot.ready).toBe(false);
    });
  });

  describe('#kick()', () => {
    beforeEach(async () => {
      await service.join(0, mockPlayer.id);
    });

    it('should reset the slot', () => {
      service.kick(mockPlayer.id);
      const slot = service.getSlotById(0);
      expect(slot.playerId).toBe(null);
      expect(slot.ready).toBe(false);
      expect(service.playerCount).toBe(0);
    });

    it('should be invoked when the player leaves the webpage', () => {
      const slot = service.getSlotById(0);
      expect(slot.playerId).toBe(mockPlayer.id);
      onlinePlayersService.playerLeft.next(mockPlayer.id);
      expect(slot.playerId).toBe(null);
    });
  });

  describe('#readyUp()', () => {
    it('should fail if the queue is not in the ready up state', async () => {
      await service.join(0, mockPlayer.id);
      expect(() => service.readyUp(mockPlayer.id)).toThrowError('queue not ready');
    });
  });
});
