import { Game, GameDocument, gameSchema } from '@/games/models/game';
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
});
