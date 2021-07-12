import { Test, TestingModule } from '@nestjs/testing';
import { MapVoteService } from './map-vote.service';
import { QueueService } from './queue.service';
import { Events } from '@/events/events';
import { typegooseTestingModule } from '@/utils/testing-typegoose-module';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Map, MapDocument, mapSchema } from '../models/map';
import { skip } from 'rxjs/operators';
import { Model } from 'mongoose';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';

jest.mock('./queue.service');

describe('MapVoteService', () => {
  let mongod: MongoMemoryServer;
  let service: MapVoteService;
  let mapModel: Model<MapDocument>;
  let queueService: jest.Mocked<QueueService>;
  let events: Events;

  beforeAll(() => (mongod = new MongoMemoryServer()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        typegooseTestingModule(mongod),
        MongooseModule.forFeature([
          {
            name: Map.name,
            schema: mapSchema,
          },
        ]),
      ],
      providers: [MapVoteService, QueueService, Events],
    }).compile();

    service = module.get<MapVoteService>(MapVoteService);
    mapModel = module.get(getModelToken(Map.name));
    queueService = module.get(QueueService);
    events = module.get(Events);
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
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should reset all votes initially', () => {
    expect(service.results.every((r) => r.voteCount === 0)).toBe(true);
  });

  describe('#voteForMap()', () => {
    it('should save the vote', () => {
      service.voteForMap('FAKE_ID', 'cp_badlands');
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
      expect(() => service.voteForMap('FAKE_ID', 'cp_sunshine')).toThrowError();
    });

    describe('when the player is not in the queue', () => {
      beforeEach(() => {
        queueService.isInQueue.mockReturnValue(false);
      });

      it('should deny', () => {
        expect(() =>
          service.voteForMap('FAKE_ID', 'cp_badlands'),
        ).toThrowError();
      });
    });

    it("should remove the player's vote when the player leaves the queue", () => {
      service.voteForMap('FAKE_PLAYER_ID', 'cp_badlands');
      expect(service.voteCountForMap('cp_badlands')).toEqual(1);
      events.playerLeavesQueue.next({
        playerId: 'FAKE_PLAYER_ID',
        reason: 'manual',
      });
      expect(service.voteCountForMap('cp_badlands')).toEqual(0);
    });

    it('should emit the mapVotesChange event', async () =>
      new Promise<void>((resolve) => {
        events.mapVotesChange.subscribe(({ results }) => {
          expect(results.length).toEqual(3);
          expect(
            results.find((r) => r.map === 'cp_badlands').voteCount,
          ).toEqual(1);
          resolve();
        });

        service.voteForMap('FAKE_ID', 'cp_badlands');
      }));
  });

  describe('#getWinner()', () => {
    it('should return the map with the most votes', async () => {
      service.voteForMap('FAKE_ID', 'cp_badlands');
      expect(await service.getWinner()).toEqual('cp_badlands');
    });

    it('should return one of two most-voted maps', async () => {
      service.voteForMap('FAKE_ID_1', 'cp_badlands');
      service.voteForMap('FAKE_ID_2', 'cp_process_final');
      expect(await service.getWinner()).toMatch(/cp_badlands|cp_process_final/);
    });

    it('should eventually reset the vote', async () =>
      new Promise<void>((resolve) => {
        events.mapVotesChange.pipe(skip(1)).subscribe(({ results }) => {
          expect(results.every((r) => r.voteCount === 0)).toBe(true);
          expect(service.mapOptions.every((m) => m !== 'cp_badlands')).toBe(
            true,
          );
          resolve();
        });

        service.voteForMap('FAKE_ID_1', 'cp_badlands');
        service.getWinner();
      }));

    describe('when a map is chosen', () => {
      beforeEach(async () => {
        service.voteForMap('FAKE_ID', 'cp_badlands');
        await service.getWinner();
      });

      it('should set the cooldown', async () => {
        const map = await mapModel.findOne({ name: 'cp_badlands' });
        expect(map.cooldown).toEqual(2);
      });

      describe('and when another map is chosen', () => {
        beforeEach(async () => {
          service.voteForMap('FAKE_ID', 'cp_process_final');
          await service.getWinner();
        });

        it('should decrease the cooldown by 1', async () => {
          const map = await mapModel.findOne({ name: 'cp_badlands' });
          expect(map.cooldown).toEqual(1);
        });
      });
    });
  });

  it('should reset the votes when map pool changes', async () => {
    service.voteForMap('FAKE_ID', 'cp_badlands');
    await mapModel.create({ name: 'cp_gullywash_final1' });
    const maps = await mapModel.find();
    events.mapPoolChange.next({ maps });

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(service.results.every((r) => r.voteCount === 0)).toBe(true);
  });
});
