import { Test, TestingModule } from '@nestjs/testing';
import { QueueService } from './queue.service';
import { PlayersService } from '@/players/services/players.service';
import { QueueConfigService } from './queue-config.service';
import { PlayerBansService } from '@/players/services/player-bans.service';
import { GamesService } from '@/games/services/games.service';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { typegooseTestingModule } from '@/utils/testing-typegoose-module';
import { Player, PlayerDocument, playerSchema } from '@/players/models/player';
import { ObjectId } from 'mongodb';
import { Game, gameSchema } from '@/games/models/game';
import { Events } from '@/events/events';
import { MongooseModule } from '@nestjs/mongoose';

jest.mock('@/players/services/players.service');
jest.mock('@/players/services/player-bans.service');
jest.mock('@/games/services/games.service');

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

const waitForImmediate = () => new Promise((resolve) => setImmediate(resolve));

describe('QueueService', () => {
  let service: QueueService;
  let mongod: MongoMemoryServer;
  let playersService: PlayersService;
  let playerBansService: PlayerBansService;
  let gamesService: GamesService;
  let events: Events;
  let player: PlayerDocument;

  beforeAll(() => (mongod = new MongoMemoryServer()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        typegooseTestingModule(mongod),
        MongooseModule.forFeature([
          { name: Player.name, schema: playerSchema },
          { name: Game.name, schema: gameSchema },
        ]),
      ],
      providers: [
        QueueService,
        PlayersService,
        PlayerBansService,
        GamesService,
        Events,
        { provide: QueueConfigService, useClass: QueueConfigServiceStub },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
    playersService = module.get(PlayersService);
    playerBansService = module.get(PlayerBansService);
    gamesService = module.get(GamesService);
    events = module.get(Events);
  });

  beforeEach(async () => {
    playerBansService.getPlayerActiveBans = () => Promise.resolve([]);
    service.onModuleInit();

    // @ts-expect-error
    player = await playersService._createOne({ hasAcceptedRules: true });
    await player.save();
  });

  afterEach(async () => {
    service.onModuleDestroy();
    // @ts-expect-error
    await playersService._reset();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should be empty initially', () => {
    expect(service.state).toEqual('waiting');
    expect(service.slots.length).toBe(12);
    expect(service.slots.every((s) => s.playerId === null)).toBe(true);
    expect(service.slots.every((s) => s.ready === false)).toBe(true);
    expect(service.playerCount).toEqual(0);
    expect(service.readyPlayerCount).toEqual(0);
    expect(service.requiredPlayerCount).toEqual(12);
  });

  describe('#reset()', () => {
    it('should emit the queueSlotsChange event', async () =>
      new Promise<void>((resolve) => {
        events.queueSlotsChange.subscribe(({ slots }) => {
          expect(slots.length).toEqual(12);
          expect(slots.every((s) => s.playerId === null)).toBe(true);
          resolve();
        });

        service.reset();
      }));
  });

  describe('#join()', () => {
    it("should fail if the given player doesn't exist", async () => {
      jest.spyOn(playersService, 'getById').mockResolvedValue(null);
      await expect(
        service.join(0, new ObjectId().toString()),
      ).rejects.toThrowError('no such player');
    });

    describe('when the player has not accepted rules', () => {
      beforeEach(async () => {
        player.hasAcceptedRules = false;
        await player.save();
      });

      it('should fail', async () => {
        await expect(service.join(0, player.id)).rejects.toThrowError(
          'player has not accepted rules',
        );
      });
    });

    describe('when the player is banned', () => {
      beforeEach(() => {
        jest
          .spyOn(playerBansService, 'getPlayerActiveBans')
          .mockResolvedValue([{} as any]);
      });

      it('should fail', async () => {
        await expect(service.join(0, player.id)).rejects.toThrowError(
          'player is banned',
        );
      });
    });

    describe('when the player is playing a game', () => {
      beforeEach(() => {
        jest
          .spyOn(gamesService, 'getPlayerActiveGame')
          .mockResolvedValue({ number: 1, state: 'started' } as any);
      });

      it('should fail', async () => {
        await expect(service.join(0, player.id)).rejects.toThrowError(
          'player involved in a currently active game',
        );
      });
    });

    describe('when the player tries to join an invalid slot', () => {
      it('should fail', async () => {
        await expect(service.join(1234567, player.id)).rejects.toThrowError(
          'no such slot',
        );
      });
    });

    describe('when the player tries to join an already occupied slot', () => {
      let player2: PlayerDocument;

      beforeEach(async () => {
        // @ts-expect-error
        player2 = await playersService._createOne();
        player2.hasAcceptedRules = true;
        await player2.save();

        await service.join(0, player2.id);
      });

      it('should fail when trying to take a slot that was already occupied', async () => {
        await expect(service.join(0, player.id)).rejects.toThrowError(
          'slot occupied',
        );
      });
    });

    it('should store add the player to the given slot', async () => {
      const slots = await service.join(0, player.id);
      const slot = slots.find((s) => s.playerId === player.id);
      expect(slot).toBeDefined();
      expect(slot.id).toBe(0);
      expect(service.playerCount).toBe(1);
    });

    it('should return the player via isInQueue()', async () => {
      await service.join(0, player.id);
      expect(service.isInQueue(player.id)).toBe(true);
    });

    it('should remove the player from already taken slot', async () => {
      const oldSlots = await service.join(0, player.id);
      const newSlots = await service.join(1, player.id);
      expect(newSlots.length).toEqual(2);
      expect(newSlots.find((s) => s.playerId === player.id)).toBeDefined();
      expect(oldSlots[0].playerId).toBeNull();
    });

    it('should emit the playerJoinsQueue event', async () =>
      new Promise<void>((resolve) => {
        events.playerJoinsQueue.subscribe(({ playerId }) => {
          expect(playerId).toEqual(player.id);
          resolve();
        });

        service.join(0, player.id);
      }));

    it('should emit the queueSlotsChange event', async () =>
      new Promise<void>((resolve) => {
        events.queueSlotsChange.subscribe(({ slots }) => {
          expect(slots).toEqual([
            { gameClass: 'scout', id: 0, playerId: player.id, ready: false },
          ]);
          resolve();
        });

        service.join(0, player.id);
      }));

    describe('when the player joins as the last one', () => {
      beforeEach(async () => {
        for (let i = 0; i < 11; ++i) {
          // @ts-expect-error
          const player = await playersService._createOne({
            hasAcceptedRules: true,
          });
          await service.join(i, player.id);
        }
      });

      it('should ready-up the slot immediately', async () => {
        const slots = await service.join(11, player.id);
        expect(slots[0].ready).toBe(true);
      });
    });
  });

  describe('#leave()', () => {
    beforeEach(async () => {
      await service.join(0, player.id);
    });

    it('should reset the slot', () => {
      const slot = service.leave(player.id);
      expect(slot.id).toBe(0);
      expect(slot.playerId).toBe(null);
      expect(slot.ready).toBe(false);
    });

    it('should emit the playerLeavesQueue event', async () =>
      new Promise<void>((resolve) => {
        events.playerLeavesQueue.subscribe(({ playerId, reason }) => {
          expect(playerId).toEqual(player.id);
          expect(reason).toEqual('manual');
          resolve();
        });

        service.leave(player.id);
      }));

    describe('when the slots is already free', () => {
      beforeEach(() => {
        service.leave(player.id);
      });

      it('should throw an error', () => {
        expect(() => service.leave(player.id)).toThrowError(
          'slot already free',
        );
      });
    });
  });

  describe('#kick()', () => {
    beforeEach(async () => {
      await service.join(0, player.id);
    });

    it('should reset the slot', () => {
      service.kick(player.id);
      const slot = service.getSlotById(0);
      expect(slot.playerId).toBe(null);
      expect(slot.ready).toBe(false);
      expect(service.playerCount).toBe(0);
    });

    it('should emit the playerLeavesQueue event', async () =>
      new Promise<void>((resolve) => {
        events.playerLeavesQueue.subscribe(({ playerId, reason }) => {
          expect(playerId).toEqual(player.id);
          expect(reason).toEqual('kicked');
          resolve();
        });

        service.kick(player.id);
      }));
  });

  describe('#readyUp()', () => {
    describe('when the queue is not in ready up state', () => {
      beforeEach(async () => {
        await service.join(0, player.id);
      });

      it('should fail', async () => {
        expect(() => service.readyUp(player.id)).toThrowError(
          'queue not ready',
        );
      });
    });
  });

  describe('when the queue is in the ready state', () => {
    let players: PlayerDocument[];

    beforeEach(async () => {
      players = [];

      for (let i = 0; i < 12; ++i) {
        // @ts-expect-error
        const player = await playersService._createOne({
          hasAcceptedRules: true,
        });
        await service.join(i, player.id);
        players.push(player);
      }

      await waitForImmediate();
    });

    it('should change the state to ready', () => {
      expect(service.state).toEqual('ready');
    });

    describe('#readyUp()', () => {
      it('should be able to ready-up all players', () => {
        players.forEach((player) => {
          const slot = service.readyUp(player.id);
          expect(slot.ready).toBe(true);
        });
      });

      it('should reject if the given player is not in the queue', () => {
        expect(() => service.readyUp(player.id)).toThrow();
      });

      it('should emit the queueSlotsChange event', async () =>
        new Promise<void>((resolve) => {
          events.queueSlotsChange.subscribe(({ slots }) => {
            expect(slots.length).toEqual(1);
            expect(slots[0].ready).toBe(true);
            resolve();
          });

          service.readyUp(players[0].id);
        }));
    });

    it('should ready up joining players immediately', async () => {
      const slot = service.leave(players[0].id);
      const slots = await service.join(slot.id, players[0].id);
      expect(slots[0].ready).toBe(true);
    });

    describe('when a player readies up', () => {
      beforeEach(() => {
        service.readyUp(players[0].id);
      });

      it('should not allow him to leave', () => {
        expect(() => service.leave(players[0].id)).toThrow();
      });
    });

    describe('when all players leave', () => {
      beforeEach(async () => {
        service.kick(...players.map((p) => p.id));
        await waitForImmediate();
      });

      it('should go back to the waiting state', () => {
        expect(service.state).toEqual('waiting');
      });
    });
  });

  describe('when a player is in the queue', () => {
    beforeEach(async () => {
      service.join(0, player.id);
    });

    describe('and after he disconnects', () => {
      beforeEach(() => {
        events.playerDisconnects.next({ playerId: player.id });
      });

      it('should kick him from the queue', () => {
        expect(service.isInQueue(player.id)).toBe(false);
      });
    });

    describe('and when he gets banned', () => {
      beforeEach(() => {
        events.playerBanAdded.next({
          ban: {
            player: player.id,
            admin: new ObjectId(),
            start: new Date(),
            end: new Date(),
            reason: 'unit testing',
          },
        });
      });

      it('should kick him from the queue', () => {
        expect(service.isInQueue(player.id)).toBe(false);
      });
    });
  });
});
