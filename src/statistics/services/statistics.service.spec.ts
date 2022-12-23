import { Game, GameDocument, gameSchema } from '@/games/models/game';
import { GameEventType } from '@/games/models/game-event';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import {
  getConnectionToken,
  getModelToken,
  MongooseModule,
} from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, Model } from 'mongoose';
import { StatisticsService } from './statistics.service';

describe('StatisticsService', () => {
  let service: StatisticsService;
  let mongod: MongoMemoryServer;
  let connection: Connection;
  let gameModel: Model<GameDocument>;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        mongooseTestingModule(mongod),
        MongooseModule.forFeature([{ name: Game.name, schema: gameSchema }]),
      ],
      providers: [StatisticsService],
    }).compile();

    service = module.get<StatisticsService>(StatisticsService);
    gameModel = module.get(getModelToken(Game.name));
    connection = module.get(getConnectionToken());
  });

  afterEach(async () => {
    await gameModel.deleteMany({});
    await connection.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#getPlayedMapsCount()', () => {
    beforeEach(async () => {
      await gameModel.create([
        {
          number: 1,
          map: 'cp_process_final',
        },
        {
          number: 2,
          map: 'cp_process_f7',
        },
        {
          number: 3,
          map: 'cp_gullywash_final1',
        },
      ]);
    });

    it('should return played maps with their game count', async () => {
      expect(await service.getPlayedMapsCount()).toEqual([
        {
          mapName: 'process',
          count: 2,
        },
        {
          mapName: 'gullywash',
          count: 1,
        },
      ]);
    });
  });

  describe('#getGameLaunchTimeSpans()', () => {
    beforeEach(async () => {
      await gameModel.create([
        {
          number: 1,
          events: [
            {
              at: new Date(2021, 10, 11, 13, 0),
              event: GameEventType.Created,
            },
          ],
          map: 'cp_process_f7',
        },
        {
          number: 2,
          events: [
            {
              at: new Date(2021, 10, 11, 19, 0),
              event: GameEventType.Created,
            },
          ],
          map: 'cp_process_f7',
        },
        {
          number: 3,
          events: [
            {
              at: new Date(2021, 10, 11, 22, 0),
              event: GameEventType.Created,
            },
          ],
          map: 'cp_process_f7',
        },
      ]);

      process.env.TZ = 'GMT';
    });

    it('should return game launch time spans', async () => {
      const ret = await service.getGameLaunchTimeSpans();
      expect(
        ret.find((r) => r.dayOfWeek === 5 && r.timeOfTheDay === 'afternoon')
          .count,
      ).toBe(1);
      expect(
        ret.find((r) => r.dayOfWeek === 5 && r.timeOfTheDay === 'evening')
          .count,
      ).toBe(2);
    });
  });

  describe('#getGameLaunchesPerDay()', () => {
    beforeEach(async () => {
      await gameModel.create([
        {
          number: 1,
          events: [
            {
              at: new Date(2021, 10, 11, 13, 0),
              event: GameEventType.Created,
            },
          ],
          map: 'cp_process_f7',
        },
        {
          number: 2,
          events: [
            {
              at: new Date(2021, 10, 11, 19, 0),
              event: GameEventType.Created,
            },
          ],
          map: 'cp_process_f7',
        },
        {
          number: 3,
          events: [
            {
              at: new Date(2021, 10, 12, 22, 0),
              event: GameEventType.Created,
            },
          ],
          map: 'cp_process_f7',
        },
      ]);

      jest.useFakeTimers({
        legacyFakeTimers: false,
        now: new Date('2020-06-06'),
        doNotFake: ['nextTick'],
      });
    });

    afterEach(() => jest.useRealTimers());

    it('should return game launch per day count', async () => {
      const since = new Date();
      since.setFullYear(since.getFullYear() - 1);
      const ret = await service.getGameLaunchesPerDay(since);
      expect(ret.find((r) => r.day === '2021-11-11').count).toBe(2);
      expect(ret.find((r) => r.day === '2021-11-12').count).toBe(1);
    });
  });
});
