import { Test, TestingModule } from '@nestjs/testing';
import { QueueService } from './queue.service';
import { Player } from '@/players/models/player';
import { Events } from '@/events/events';
import { NoSuchSlotError } from '../errors/no-such-slot.error';
import { SlotOccupiedError } from '../errors/slot-occupied.error';
import { PlayerNotInTheQueueError } from '../errors/player-not-in-the-queue.error';
import { WrongQueueStateError } from '../errors/wrong-queue-state.error';
import { Types } from 'mongoose';
import { CACHE_MANAGER } from '@nestjs/common';
import { QueueState } from '../queue-state';
import { QueueSlot } from '../queue-slot';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { PlayerBanId } from '@/players/types/player-ban-id';
import { PlayerId } from '@/players/types/player-id';

jest.mock('@/configuration/services/configuration.service', () => ({
  ConfigurationService: jest.fn().mockImplementation(() => {
    return {
      get: jest.fn().mockImplementation((key: string) =>
        Promise.resolve(
          {
            'queue.ready_up_timeout': 40 * 1000,
            'queue.ready_state_timeout': 60 * 1000,
          }[key],
        ),
      ),
    };
  }),
}));

class CacheStub {
  set = jest.fn();
  get = jest.fn().mockResolvedValue(null);
}

const waitForImmediate = () => new Promise((resolve) => setImmediate(resolve));

describe('QueueService', () => {
  let service: QueueService;
  let events: Events;
  let player: Player;
  let cache: CacheStub;
  let configurationService: jest.Mocked<ConfigurationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        Events,
        {
          provide: 'QUEUE_CONFIG',
          useValue: {
            classes: [
              { name: 'scout', count: 2 },
              { name: 'soldier', count: 2 },
              { name: 'demoman', count: 1 },
              { name: 'medic', count: 1 },
            ],
            teamCount: 2,
          },
        },
        { provide: CACHE_MANAGER, useClass: CacheStub },
        ConfigurationService,
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
    events = module.get(Events);
    cache = module.get(CACHE_MANAGER);
  });

  beforeEach(() => {
    player = new Player();
    player._id = new Types.ObjectId() as PlayerId;
    player.id = player._id.toString();
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('when there is a queue cached', () => {
    beforeEach(async () => {
      cache.get.mockResolvedValue({
        slots: [
          {
            id: 0,
            gameClass: 'scout',
            playerId: 'FAKE_PLAYER_ID',
            ready: false,
            player: {
              name: 'bambi',
              avatar: {
                small:
                  'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/3e/3eb846d3debfc86233e3aa22b2059394ce285aac.jpg',
                medium:
                  'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/3e/3eb846d3debfc86233e3aa22b2059394ce285aac_medium.jpg',
                large:
                  'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/3e/3eb846d3debfc86233e3aa22b2059394ce285aac_full.jpg',
              },
              steamId: 'FAKE_STEAM_ID',
              etf2lProfileId: 106940,
              roles: [],
              joinedAt: '2021-10-29T20:45:10.211Z',
              id: 'FAKE_PLAYER_ID',
            },
          },
          {
            id: 1,
            gameClass: 'scout',
            playerId: null,
            ready: false,
            player: null,
          },
          {
            id: 2,
            gameClass: 'scout',
            playerId: null,
            ready: false,
            player: null,
          },
          {
            id: 3,
            gameClass: 'scout',
            playerId: null,
            ready: false,
            player: null,
          },
          {
            id: 4,
            gameClass: 'soldier',
            playerId: null,
            ready: false,
            player: null,
          },
          {
            id: 5,
            gameClass: 'soldier',
            playerId: null,
            ready: false,
            player: null,
          },
          {
            id: 6,
            gameClass: 'soldier',
            playerId: null,
            ready: false,
            player: null,
          },
          {
            id: 7,
            gameClass: 'soldier',
            playerId: null,
            ready: false,
            player: null,
          },
          {
            id: 8,
            gameClass: 'demoman',
            playerId: null,
            ready: false,
            player: null,
          },
          {
            id: 9,
            gameClass: 'demoman',
            playerId: null,
            ready: false,
            player: null,
          },
          {
            id: 10,
            gameClass: 'medic',
            playerId: null,
            ready: false,
            player: null,
          },
          {
            id: 11,
            gameClass: 'medic',
            playerId: null,
            ready: false,
            player: null,
          },
        ],
        state: QueueState.waiting,
      });

      service.onModuleInit();
      await service.onApplicationBootstrap();
    });

    it('should restore the queue from cache', () => {
      expect(service.slots[0].playerId).toEqual('FAKE_PLAYER_ID');
    });
  });

  describe('when the cache is empty', () => {
    beforeEach(async () => {
      service.onModuleInit();
      await service.onApplicationBootstrap();
    });

    it('should be empty initially', () => {
      expect(service.state).toEqual(QueueState.waiting);
      expect(service.slots.length).toBe(12);
      expect(service.slots.every((s) => s.playerId === null)).toBe(true);
      expect(service.slots.every((s) => s.ready === false)).toBe(true);
      expect(service.playerCount).toEqual(0);
      expect(service.readyPlayerCount).toEqual(0);
      expect(service.requiredPlayerCount).toEqual(12);
    });

    describe('#reset()', () => {
      it('should emit the queueSlotsChange event', () =>
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
      describe('when the player tries to join an invalid slot', () => {
        it('should fail', () => {
          expect(() =>
            service.join(1234567, new Types.ObjectId(player.id) as PlayerId),
          ).toThrow(NoSuchSlotError);
        });
      });

      describe('when the player tries to join an already occupied slot', () => {
        beforeEach(() => {
          service.join(0, new Types.ObjectId() as PlayerId);
        });

        it('should fail when trying to take a slot that was already occupied', () => {
          expect(() =>
            service.join(0, new Types.ObjectId(player.id) as PlayerId),
          ).toThrow(SlotOccupiedError);
        });
      });

      it('should add the player to the given slot', () => {
        const slots = service.join(
          0,
          new Types.ObjectId(player.id) as PlayerId,
        );
        const slot = slots.find((s) => s.playerId?.equals(player._id));
        expect(slot).toBeDefined();
        expect((slot as QueueSlot).id).toBe(0);
        expect(service.playerCount).toBe(1);
      });

      it('should return the player via isInQueue()', () => {
        service.join(0, new Types.ObjectId(player.id) as PlayerId);
        expect(service.isInQueue(player._id)).toBe(true);
      });

      it('should remove the player from already taken slot', () => {
        const oldSlots = service.join(
          0,
          new Types.ObjectId(player.id) as PlayerId,
        );
        const newSlots = service.join(
          1,
          new Types.ObjectId(player.id) as PlayerId,
        );
        expect(newSlots.length).toEqual(2);
        expect(
          newSlots.find((s) => s.playerId?.equals(player._id)),
        ).toBeDefined();
        expect(oldSlots[0].playerId).toBeNull();
      });

      it('should emit the playerJoinsQueue event', () =>
        new Promise<void>((resolve) => {
          events.playerJoinsQueue.subscribe(({ playerId }) => {
            expect(playerId).toEqual(player._id);
            resolve();
          });

          service.join(0, new Types.ObjectId(player.id) as PlayerId);
        }));

      it('should emit the queueSlotsChange event', () =>
        new Promise<void>((resolve) => {
          events.queueSlotsChange.subscribe(({ slots }) => {
            expect(slots).toEqual([
              { gameClass: 'scout', id: 0, playerId: player._id, ready: false },
            ]);
            resolve();
          });

          service.join(0, new Types.ObjectId(player.id) as PlayerId);
        }));

      describe('when the player joins as the last one', () => {
        beforeEach(() => {
          for (let i = 0; i < 11; ++i) {
            service.join(i, new Types.ObjectId() as PlayerId);
          }
        });

        it('should ready-up the slot immediately', () => {
          const slots = service.join(
            11,
            new Types.ObjectId(player.id) as PlayerId,
          );
          expect(slots[0].ready).toBe(true);
        });
      });

      it('should update queue cache', () =>
        new Promise<void>((resolve) => {
          cache.set.mockImplementation((key, value) => {
            expect(key).toEqual('queue');
            expect(value).toEqual({
              slots: expect.any(Array),
              state: QueueState.waiting,
            });
            expect(
              value.slots.find((s: QueueSlot) =>
                s.playerId?.equals(player._id),
              ),
            ).toBeTruthy();
            resolve();
          });
          service.join(0, new Types.ObjectId(player.id) as PlayerId);
        }));
    });

    describe('#leave()', () => {
      beforeEach(() => {
        service.join(0, new Types.ObjectId(player.id) as PlayerId);
      });

      it('should reset the slot', () => {
        const slot = service.leave(player._id);
        expect(slot.id).toBe(0);
        expect(slot.playerId).toBe(null);
        expect(slot.ready).toBe(false);
      });

      it('should emit the playerLeavesQueue event', () =>
        new Promise<void>((resolve) => {
          events.playerLeavesQueue.subscribe(({ playerId, reason }) => {
            expect(playerId).toEqual(player._id);
            expect(reason).toEqual('manual');
            resolve();
          });

          service.leave(player._id);
        }));

      describe('when the slots is already free', () => {
        beforeEach(() => {
          service.leave(player._id);
        });

        it('should throw an error', () => {
          expect(() => service.leave(player._id)).toThrow(
            PlayerNotInTheQueueError,
          );
        });
      });

      it('should update queue cache', () =>
        new Promise<void>((resolve) => {
          cache.set.mockImplementation((key, value) => {
            expect(key).toEqual('queue');
            expect(value).toEqual({
              slots: expect.any(Array),
              state: QueueState.waiting,
            });
            expect(
              value.slots.every((s: QueueSlot) => s.playerId === null),
            ).toBe(true);
            resolve();
          });
          service.leave(player._id);
        }));
    });

    describe('#kick()', () => {
      beforeEach(() => {
        service.join(0, new Types.ObjectId(player.id) as PlayerId);
      });

      it('should reset the slot', () => {
        service.kick(player._id);
        const slot = service.getSlotById(0);
        expect(slot).toBeTruthy();
        expect((slot as QueueSlot).playerId).toBe(null);
        expect((slot as QueueSlot).ready).toBe(false);
        expect(service.playerCount).toBe(0);
      });

      it('should emit the playerLeavesQueue event', () =>
        new Promise<void>((resolve) => {
          events.playerLeavesQueue.subscribe(({ playerId, reason }) => {
            expect(playerId).toEqual(player._id);
            expect(reason).toEqual('kicked');
            resolve();
          });

          service.kick(player._id);
        }));

      it('should update queue cache', () =>
        new Promise<void>((resolve) => {
          cache.set.mockImplementation((key, value) => {
            expect(key).toEqual('queue');
            expect(value).toEqual({
              slots: expect.any(Array),
              state: QueueState.waiting,
            });
            expect(
              value.slots.every((s: QueueSlot) => s.playerId === null),
            ).toBe(true);
            resolve();
          });
          service.kick(player._id);
        }));
    });

    describe('#readyUp()', () => {
      describe('when the queue is not in ready up state', () => {
        beforeEach(() => {
          service.join(0, new Types.ObjectId(player.id) as PlayerId);
        });

        it('should fail', () => {
          expect(() => service.readyUp(player._id)).toThrow(
            WrongQueueStateError,
          );
        });
      });
    });

    describe('when the queue is in the ready state', () => {
      let players: Player[];

      beforeEach(async () => {
        players = [];

        for (let i = 0; i < 12; ++i) {
          const player = new Player();
          player._id = new Types.ObjectId() as PlayerId;
          player.id = player._id.toString();
          service.join(i, new Types.ObjectId(player.id) as PlayerId);
          players.push(player);
        }

        await waitForImmediate();
      });

      it('should change the state to ready', () => {
        expect(service.state).toEqual(QueueState.ready);
      });

      describe('#readyUp()', () => {
        it('should be able to ready-up all players', () => {
          players.forEach((player) => {
            const slot = service.readyUp(player._id);
            expect(slot.ready).toBe(true);
          });
        });

        it('should reject if the given player is not in the queue', () => {
          expect(() => service.readyUp(player._id)).toThrow();
        });

        it('should emit the queueSlotsChange event', () =>
          new Promise<void>((resolve) => {
            events.queueSlotsChange.subscribe(({ slots }) => {
              expect(slots.length).toEqual(1);
              expect(slots[0].ready).toBe(true);
              resolve();
            });

            service.readyUp(players[0]._id);
          }));
      });

      it('should ready up joining players immediately', () => {
        const slot = service.leave(
          new Types.ObjectId(players[0].id) as PlayerId,
        );
        const slots = service.join(
          slot.id,
          new Types.ObjectId(players[0].id) as PlayerId,
        );
        expect(slots[0].ready).toBe(true);
      });

      describe('when a player readies up', () => {
        beforeEach(() => {
          service.readyUp(players[0]._id);
        });

        it('should not allow him to leave', () => {
          expect(() => service.leave(players[0]._id)).toThrow();
        });
      });

      describe('when all players leave', () => {
        beforeEach(async () => {
          service.kick(
            ...players.map((p) => new Types.ObjectId(p.id) as PlayerId),
          );
          await waitForImmediate();
        });

        it('should go back to the waiting state', () => {
          expect(service.state).toEqual(QueueState.waiting);
        });
      });
    });

    describe('when a player is in the queue', () => {
      beforeEach(() => {
        service.join(0, new Types.ObjectId(player.id) as PlayerId);
      });

      describe('and after he disconnects', () => {
        beforeEach(() => {
          events.playerDisconnects.next({ playerId: player._id });
        });

        it('should kick him from the queue', () => {
          expect(service.isInQueue(player._id)).toBe(false);
        });
      });

      describe('and when he gets banned', () => {
        beforeEach(() => {
          events.playerBanAdded.next({
            ban: {
              _id: new Types.ObjectId() as PlayerBanId,
              id: 'FAKE_ID',
              player: player._id,
              admin: new Types.ObjectId() as PlayerId,
              start: new Date(),
              end: new Date(),
              reason: 'unit testing',
              serialize: jest.fn(),
            },
          });
        });

        it('should kick him from the queue', () => {
          expect(service.isInQueue(player._id)).toBe(false);
        });
      });
    });
  });
});
