import { ConfigurationService } from '@/configuration/services/configuration.service';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import { getConnectionToken, MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection } from 'mongoose';
import { Player, playerSchema } from '../models/player';
import { PlayerBansService } from './player-bans.service';
import { PlayerCooldownService } from './player-cooldown.service';
import { PlayersService } from './players.service';
// eslint-disable-next-line jest/no-mocks-import
import { PlayersService as MockPlayersService } from './__mocks__/players.service';

jest.mock('@/configuration/services/configuration.service');
jest.mock('./players.service');
jest.mock('./player-bans.service');

describe('PlayerCooldownService', () => {
  let service: PlayerCooldownService;
  let mongod: MongoMemoryServer;
  let connection: Connection;
  let playersService: MockPlayersService;
  let configurationService: jest.Mocked<ConfigurationService>;
  let playerBansService: jest.Mocked<PlayerBansService>;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        mongooseTestingModule(mongod),
        MongooseModule.forFeature([
          {
            name: Player.name,
            schema: playerSchema,
          },
        ]),
      ],
      providers: [
        PlayerCooldownService,
        PlayersService,
        ConfigurationService,
        PlayerBansService,
      ],
    }).compile();

    service = module.get<PlayerCooldownService>(PlayerCooldownService);
    connection = module.get(getConnectionToken());
    playersService = module.get(PlayersService);
    configurationService = module.get(ConfigurationService);
    playerBansService = module.get(PlayerBansService);
  });

  afterEach(async () => {
    await playersService._reset();
    await connection.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
