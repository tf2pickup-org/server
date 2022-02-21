import { Environment } from '@/environment/environment';
import { Events } from '@/events/events';
import {
  GameServer,
  GameServerSchema,
} from '@/game-servers/models/game-server';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import { getConnectionToken, MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection } from 'mongoose';
import { StaticGameServersService } from './static-game-servers.service';

jest.mock('@/game-servers/services/game-servers.service');
jest.mock('@/environment/environment');

describe('StaticGameServersService', () => {
  let service: StaticGameServersService;
  let mongod: MongoMemoryServer;
  let connection: Connection;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        mongooseTestingModule(mongod),
        MongooseModule.forFeature([
          { name: GameServer.name, schema: GameServerSchema },
        ]),
      ],
      providers: [
        StaticGameServersService,
        Events,
        GameServersService,
        Environment,
      ],
    }).compile();

    service = module.get<StaticGameServersService>(StaticGameServersService);
    connection = module.get(getConnectionToken());
  });

  afterEach(async () => {
    await connection.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
