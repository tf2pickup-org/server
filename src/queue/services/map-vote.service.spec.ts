import { Test, TestingModule } from '@nestjs/testing';
import { MapVoteService } from './map-vote.service';
import { QueueService } from './queue.service';
import { Events } from '@/events/events';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  MapPoolEntry,
  MapPoolEntryDocument,
  mapPoolEntrySchema,
} from '../models/map-pool-entry';
import { skip } from 'rxjs/operators';
import { Connection, Model, Types } from 'mongoose';
import {
  getConnectionToken,
  getModelToken,
  MongooseModule,
} from '@nestjs/mongoose';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { PlayerId } from '@/players/types/player-id';
import { waitABit } from '@/utils/wait-a-bit';

jest.mock('./queue.service');
jest.mock('@/configuration/services/configuration.service', () => ({
  ConfigurationService: jest.fn().mockImplementation(() => {
    return {
      get: jest.fn().mockImplementation((key: string) =>
        Promise.resolve(
          {
            'queue.map_cooldown': 2,
          }[key],
        ),
      ),
    };
  }),
}));

describe('MapVoteService', () => {
  let mongod: MongoMemoryServer;
  let service: MapVoteService;
  let mapModel: Model<MapPoolEntryDocument>;
  let queueService: jest.Mocked<QueueService>;
  let events: Events;
  let connection: Connection;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        mongooseTestingModule(mongod),
        MongooseModule.forFeature([
          {
            name: MapPoolEntry.name,
            schema: mapPoolEntrySchema,
          },
        ]),
      ],
      providers: [MapVoteService, QueueService, Events, ConfigurationService],
    }).compile();

    service = module.get<MapVoteService>(MapVoteService);
    mapModel = module.get(getModelToken(MapPoolEntry.name));
    queueService = module.get(QueueService);
    events = module.get(Events);
    connection = module.get(getConnectionToken());
  });

  beforeEach(async () => {
    await mapModel.insertMany([
      { name: 'cp_badlands' },
      { name: 'cp_process_final' },
      { name: 'cp_snakewater_final1' },
    ]);
    queueService.isInQueue.mockReturnValue(true);
  });

  beforeEach(async () => await service.onModuleInit());

  afterEach(async () => {
    await mapModel.deleteMany({});
    await connection.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should reset all votes initially', () => {
    expect(service.results.every((r) => r.voteCount === 0)).toBe(true);
  });

  describe('#voteForMap()', () => {
    it('should save the vote', () => {
      service.voteForMap(new Types.ObjectId() as PlayerId, 'cp_badlands');
      expect(service.results).toEqual(
        expect.arrayContaining([
          { map: 'cp_badlands', voteCount: 1 },
          { map: 'cp_process_final', voteCount: 0 },
          { map: 'cp_snakewater_final1', voteCount: 0 },
        ]),
      );
      expect(service.voteCountForMap('cp_badlands')).toEqual(1);
    });

    it('should deny voting for maps out of pool', () => {
      expect(() =>
        service.voteForMap(new Types.ObjectId() as PlayerId, 'cp_sunshine'),
      ).toThrow();
    });

    describe('when the player is not in the queue', () => {
      beforeEach(() => {
        queueService.isInQueue.mockReturnValue(false);
      });

      it('should deny', () => {
        expect(() =>
          service.voteForMap(new Types.ObjectId() as PlayerId, 'cp_badlands'),
        ).toThrow();
      });
    });

    it("should remove the player's vote when the player leaves the queue", () => {
      const playerId = new Types.ObjectId() as PlayerId;
      service.voteForMap(playerId, 'cp_badlands');
      expect(service.voteCountForMap('cp_badlands')).toEqual(1);
      events.playerLeavesQueue.next({
        playerId,
        reason: 'manual',
      });
      expect(service.voteCountForMap('cp_badlands')).toEqual(0);
    });

    it('should emit the mapVotesChange event', () =>
      new Promise<void>((resolve) => {
        events.mapVotesChange.subscribe(({ results }) => {
          expect(results.length).toEqual(3);
          expect(
            results.find((r) => r.map === 'cp_badlands')?.voteCount,
          ).toEqual(1);
          resolve();
        });

        service.voteForMap(new Types.ObjectId() as PlayerId, 'cp_badlands');
      }));
  });

  describe('#getWinner()', () => {
    it('should return the map with the most votes', async () => {
      service.voteForMap(new Types.ObjectId() as PlayerId, 'cp_badlands');
      expect(await service.getWinner()).toEqual('cp_badlands');
    });

    it('should return one of two most-voted maps', async () => {
      service.voteForMap(new Types.ObjectId() as PlayerId, 'cp_badlands');
      service.voteForMap(new Types.ObjectId() as PlayerId, 'cp_process_final');
      expect(await service.getWinner()).toMatch(/cp_badlands|cp_process_final/);
    });

    it('should eventually reset the vote', () =>
      new Promise<void>((resolve) => {
        events.mapVotesChange.pipe(skip(1)).subscribe(({ results }) => {
          expect(results.every((r) => r.voteCount === 0)).toBe(true);
          expect(service.mapOptions.every((m) => m !== 'cp_badlands')).toBe(
            true,
          );
          resolve();
        });

        service.voteForMap(new Types.ObjectId() as PlayerId, 'cp_badlands');
        service.getWinner();
      }));

    describe('when a map is chosen', () => {
      beforeEach(async () => {
        service.voteForMap(new Types.ObjectId() as PlayerId, 'cp_badlands');
        await service.getWinner();
        await waitABit(100);
      });

      it('should set the cooldown', async () => {
        const map = await mapModel.findOne({ name: 'cp_badlands' }).orFail();
        expect(map.cooldown).toEqual(2);
      });

      describe('and when another map is chosen', () => {
        beforeEach(async () => {
          service.voteForMap(
            new Types.ObjectId() as PlayerId,
            'cp_process_final',
          );
          const winner = await service.getWinner();
          await waitABit(100);
        });

        it('should decrease the cooldown by 1', async () => {
          const map = await mapModel.findOne({ name: 'cp_badlands' }).orFail();
          expect(map.cooldown).toEqual(1);
        });
      });
    });
  });

  describe('#scramble()', () => {
    it('should emit the mapsScrambled event', () =>
      new Promise<void>((resolve) => {
        const actorId = new Types.ObjectId() as PlayerId;
        events.mapsScrambled.subscribe(({ actorId }) => {
          expect(actorId).toEqual(actorId);
          resolve();
        });
        service.scramble(actorId);
      }));
  });

  it('should reset the votes when map pool changes', async () => {
    service.voteForMap(new Types.ObjectId() as PlayerId, 'cp_badlands');
    await mapModel.create({ name: 'cp_gullywash_final1' });
    const maps = await mapModel.find();
    events.mapPoolChange.next({ maps });

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(service.results.every((r) => r.voteCount === 0)).toBe(true);
  });
});
