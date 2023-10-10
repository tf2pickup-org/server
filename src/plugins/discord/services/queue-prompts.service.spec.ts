import { Test, TestingModule } from '@nestjs/testing';
import { QueuePromptsService } from './queue-prompts.service';
import { Events } from '@/events/events';
import { Environment } from '@/environment/environment';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { PlayersService } from '@/players/services/players.service';
import { Client } from '@mocks/discord.js';
import { CacheModule } from '@nestjs/cache-manager';
import { Game, gameSchema } from '@/games/models/game';
import { Player, playerSchema } from '@/players/models/player';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection } from 'mongoose';
// eslint-disable-next-line jest/no-mocks-import
import { PlayersService as PlayersServiceMock } from '@/players/services/__mocks__/players.service';

jest.mock('@/configuration/services/configuration.service');
jest.mock('@/players/services/players.service');

const environment = {
  clientUrl: 'http://localhost',
};

describe('QueuePromptsService', () => {
  let service: QueuePromptsService;
  let client: Client;
  let mongod: MongoMemoryServer;
  let connection: Connection;
  let playersService: PlayersServiceMock;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        mongooseTestingModule(mongod),
        MongooseModule.forFeature([
          { name: Game.name, schema: gameSchema },
          {
            name: Player.name,
            schema: playerSchema,
          },
        ]),
        CacheModule.register(),
      ],
      providers: [
        QueuePromptsService,
        Events,
        { provide: Environment, useValue: environment },
        ConfigurationService,
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
        PlayersService,
        {
          provide: 'DISCORD_CLIENT',
          useValue: client,
        },
      ],
    }).compile();

    service = module.get<QueuePromptsService>(QueuePromptsService);
    connection = module.get(getConnectionToken());
    playersService = module.get(PlayersService);
  });

  afterEach(async () => {
    await playersService._reset();
    await connection.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
