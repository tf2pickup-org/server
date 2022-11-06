import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import {
  getConnectionToken,
  getModelToken,
  MongooseModule,
} from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, Model, Types } from 'mongoose';
import {
  PlayerActionEntry,
  playerActionEntrySchema,
} from '../models/player-action-entry';
import { PlayerActionsRepositoryService } from './player-actions-repository.service';

describe('PlayerActionsRepositoryService', () => {
  let service: PlayerActionsRepositoryService;
  let mongod: MongoMemoryServer;
  let connection: Connection;
  let playerActionEntryModel: Model<PlayerActionEntry>;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlayerActionsRepositoryService],
      imports: [
        mongooseTestingModule(mongod),
        MongooseModule.forFeature([
          {
            name: PlayerActionEntry.name,
            schema: playerActionEntrySchema,
          },
        ]),
      ],
    }).compile();

    service = module.get<PlayerActionsRepositoryService>(
      PlayerActionsRepositoryService,
    );

    connection = module.get(getConnectionToken());
    playerActionEntryModel = module.get(getModelToken(PlayerActionEntry.name));
  });

  afterEach(async () => {
    await connection.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#find()', () => {
    beforeEach(async () => {
      await playerActionEntryModel.create({
        player: new Types.ObjectId(),
        ipAddress: '127.0.0.1',
        userAgent: 'FAKE_USER_AGENT',
        action: 'FAKE_ACTION',
      });
    });

    it('should find entries', async () => {
      const entries = await service.find();
      expect(entries.length).toBe(1);
    });
  });
});
