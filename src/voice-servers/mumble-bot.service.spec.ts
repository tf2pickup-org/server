import { CertificatesService } from '@/certificates/services/certificates.service';
import { ConfigurationEntryKey } from '@/configuration/models/configuration-entry-key';
import { SelectedVoiceServer } from '@/configuration/models/voice-server';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { Environment } from '@/environment/environment';
import { Events } from '@/events/events';
import { Game, gameSchema } from '@/games/models/game';
import { GameState } from '@/games/models/game-state';
import { GamesService } from '@/games/services/games.service';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import { getConnectionToken, MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Client } from '@tf2pickup-org/simple-mumble-bot';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection } from 'mongoose';
import { MumbleBotService } from './mumble-bot.service';

const mockSubCreateSubChannel = jest.fn();
const mockCreateSubChannel = jest.fn().mockResolvedValue({
  createSubChannel: mockSubCreateSubChannel,
});
const mockSubChannels = [];

jest.mock('@/environment/environment');
jest.mock('@/configuration/services/configuration.service');
jest.mock('@/certificates/services/certificates.service');
jest.mock('@/games/services/games.service');
jest.mock('@tf2pickup-org/simple-mumble-bot', () => ({
  Client: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    channels: {
      byId: jest.fn(),
      byName: jest.fn().mockReturnValue({
        id: 5,
      }),
      byPath: jest.fn(),
      findAll: jest.fn(),
    },
    user: {
      moveToChannel: jest.fn(),
      channel: {
        getPermissions: jest.fn().mockResolvedValue({
          canCreateChannel: true,
        }),
        createSubChannel: mockCreateSubChannel,
        subChannels: mockSubChannels,
      },
    },
  })),
}));

describe('MumbleBotService', () => {
  let service: MumbleBotService;
  let mongod: MongoMemoryServer;
  let connection: Connection;
  let configurationService: jest.Mocked<ConfigurationService>;
  let certificatesService: jest.Mocked<CertificatesService>;
  let environment: jest.Mocked<Environment>;
  let events: Events;
  let gamesService: GamesService;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        mongooseTestingModule(mongod),
        MongooseModule.forFeature([{ name: Game.name, schema: gameSchema }]),
      ],
      providers: [
        MumbleBotService,
        Environment,
        ConfigurationService,
        Events,
        CertificatesService,
        GamesService,
      ],
    }).compile();

    service = module.get<MumbleBotService>(MumbleBotService);
    connection = module.get(getConnectionToken());
    configurationService = module.get(ConfigurationService);
    certificatesService = module.get(CertificatesService);
    environment = module.get(Environment);
    events = module.get(Events);
    gamesService = module.get(GamesService);
  });

  beforeEach(() => {
    configurationService.getVoiceServer.mockResolvedValue({
      key: ConfigurationEntryKey.voiceServer,
      type: SelectedVoiceServer.mumble,
      mumble: {
        url: 'FAKE_MUMBLE_URL',
        port: 64738,
      },
    });
    certificatesService.getCertificate.mockResolvedValue({
      id: 'FAKE_ID',
      purpose: 'mumble',
      clientKey: 'FAKE_CLIENT_KEY',
      certificate: 'FAKE_CERTIFICATE',
    });
    (environment.botName as string) = 'FAKE_BOT_NAME';
  });

  beforeEach(async () => {
    await service.onModuleInit();
  });

  afterEach(async () => {
    await connection.close();
    (Client as jest.MockedClass<typeof Client>).mockClear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should connect to the mumble server', () => {
    expect(Client).toHaveBeenNthCalledWith(1, {
      host: 'FAKE_MUMBLE_URL',
      port: 64738,
      username: 'FAKE_BOT_NAME',
      key: 'FAKE_CLIENT_KEY',
      cert: 'FAKE_CERTIFICATE',
      rejectUnauthorized: false,
    });
  });

  describe('when a game is created', () => {
    beforeEach(() => {
      const game = new Game();
      game.number = 1234;
      events.gameCreated.next({ game });
    });

    it('should create channels', () => {
      expect(mockCreateSubChannel).toHaveBeenCalledWith('1234');
      expect(mockSubCreateSubChannel).toHaveBeenCalledWith('BLU');
      expect(mockSubCreateSubChannel).toHaveBeenCalledWith('RED');
    });
  });

  describe('#removeOldChannels()', () => {
    describe('when there is a channel that is not a game number', () => {
      beforeEach(() => {
        mockSubChannels.push({ name: 'FAKE_CHANNEL_NAME' });
      });

      afterEach(() => {
        mockSubChannels.length = 0;
      });

      it('should do nothing', async () => {
        await expect(service.removeOldChannels()).resolves.not.toThrow();
      });
    });

    describe('when there are no users', () => {
      const remove = jest.fn();

      beforeEach(async () => {
        // @ts-expect-error
        const game = await gamesService._createOne();
        game.state = GameState.ended;
        await game.save();

        mockSubChannels.push({
          name: `${game.number}`,
          users: [],
          subChannels: [
            {
              users: [],
            },
            {
              users: [],
            },
          ],
          remove,
        });
      });

      afterEach(async () => {
        mockSubChannels.length = 0;
        remove.mockClear();
        // @ts-expect-error
        await gamesService._reset();
      });

      it('should remove the channel', async () => {
        await service.removeOldChannels();
        expect(remove).toHaveBeenCalled();
      });
    });

    describe('when there are users in subchannels', () => {
      const remove = jest.fn();

      beforeEach(async () => {
        // @ts-expect-error
        const game = await gamesService._createOne();
        game.state = GameState.ended;
        await game.save();

        mockSubChannels.push({
          name: `${game.number}`,
          users: [],
          subChannels: [
            {
              users: [{}],
            },
            {
              users: [],
            },
          ],
          remove,
        });
      });

      afterEach(async () => {
        mockSubChannels.length = 0;
        remove.mockClear();
        // @ts-expect-error
        await gamesService._reset();
      });

      it('should not remove the channel', async () => {
        await service.removeOldChannels();
        expect(remove).not.toHaveBeenCalled();
      });
    });

    describe('when the game is in progress', () => {
      const remove = jest.fn();

      beforeEach(async () => {
        // @ts-expect-error
        const game = await gamesService._createOne();
        game.state = GameState.started;
        await game.save();

        mockSubChannels.push({
          name: `${game.number}`,
          users: [],
          subChannels: [
            {
              users: [],
            },
            {
              users: [],
            },
          ],
          remove,
        });
      });

      afterEach(async () => {
        mockSubChannels.length = 0;
        remove.mockClear();
        // @ts-expect-error
        await gamesService._reset();
      });

      it('should not remove the channel', async () => {
        await service.removeOldChannels();
        expect(remove).not.toHaveBeenCalled();
      });
    });
  });
});
