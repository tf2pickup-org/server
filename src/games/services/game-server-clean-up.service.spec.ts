import { Events } from '@/events/events';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import {
  getConnectionToken,
  getModelToken,
  MongooseModule,
} from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, Model } from 'mongoose';
import { Game, GameDocument, gameSchema } from '../models/game';
import { GameServerCleanUpService } from './game-server-clean-up.service';
import { GamesService } from './games.service';
import { ServerConfiguratorService } from './server-configurator.service';

jest.mock('./games.service');
jest.mock('@/game-servers/services/game-servers.service');
jest.mock('./server-configurator.service');

describe('GameServerCleanUpService', () => {
  let service: GameServerCleanUpService;
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
      providers: [
        GameServerCleanUpService,
        GamesService,
        GameServersService,
        ServerConfiguratorService,
        Events,
      ],
    }).compile();

    service = module.get<GameServerCleanUpService>(GameServerCleanUpService);
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
});
