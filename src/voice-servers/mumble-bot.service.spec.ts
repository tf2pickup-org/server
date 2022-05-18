import { CertificatesService } from '@/certificates/services/certificates.service';
import { ConfigurationEntryKey } from '@/configuration/models/configuration-entry-key';
import { SelectedVoiceServer } from '@/configuration/models/voice-server';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { Environment } from '@/environment/environment';
import { Events } from '@/events/events';
import { Game, gameSchema } from '@/games/models/game';
import { GameState } from '@/games/models/game-state';
import { GameRuntimeService } from '@/games/services/game-runtime.service';
import { GamesService } from '@/games/services/games.service';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import { getConnectionToken, MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Client } from '@tf2pickup-org/simple-mumble-bot';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection } from 'mongoose';
import { MumbleBotService } from './mumble-bot.service';

jest.mock('@/environment/environment');
jest.mock('@/configuration/services/configuration.service');
jest.mock('@/certificates/services/certificates.service');
jest.mock('@/games/services/games.service');
jest.mock('@tf2pickup-org/simple-mumble-bot');
jest.mock('@/games/services/game-runtime.service');

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
        GameRuntimeService,
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
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should connect to the mumble server', () => {
    // @ts-expect-error
    const client = Client._lastInstance;
    expect(client.options).toEqual({
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
      // @ts-expect-error
      const client = Client._lastInstance;
      expect(client.user.channel.subChannels[0].name).toBe('1234');
      expect(client.user.channel.subChannels[0].subChannels[0].name).toBe(
        'BLU',
      );
      expect(client.user.channel.subChannels[0].subChannels[1].name).toBe(
        'RED',
      );
    });
  });

  describe('when a game ends', () => {
    let client;

    beforeEach(() => {
      // @ts-expect-error
      client = Client._lastInstance;
    });

    beforeEach(async () => {
      const ch = await client.user.channel.createSubChannel('2');
      await ch.createSubChannel('BLU');
      await ch.createSubChannel('RED');

      const oldGame = new Game();
      oldGame.number = 2;
      oldGame.state = GameState.started;
      events.gameChanges.next({ game: oldGame });

      const newGame = new Game();
      newGame.number = 2;
      newGame.state = GameState.ended;
      events.gameChanges.next({ game: newGame });
    });

    it('should link channels', () => {
      const red = client.user.channel.subChannels[0].subChannels[1];
      expect(red.link).toHaveBeenCalled();
      expect(red.links.length).toBe(1);
    });
  });

  describe('#removeOldChannels()', () => {
    let client;

    beforeEach(() => {
      // @ts-expect-error
      client = Client._lastInstance;
    });

    describe('when there is a channel that is not a game channel', () => {
      beforeEach(() => {
        client.user.channel.createSubChannel('not a game channel');
      });

      it('should not remove it', async () => {
        await service.removeOldChannels();
        expect(client.user.channel.subChannels.length).toBe(1);
      });
    });

    describe('when there are no users', () => {
      beforeEach(async () => {
        // @ts-expect-error
        const game = await gamesService._createOne();
        game.state = GameState.ended;
        await game.save();

        await client.user.channel.createSubChannel(`${game.number}`);
      });

      afterEach(async () => {
        // @ts-expect-error
        await gamesService._reset();
      });

      it('should remove the channel', async () => {
        await service.removeOldChannels();
        expect(client.user.channel.subChannels.length).toBe(0);
      });
    });

    describe('when there are users in subchannels', () => {
      beforeEach(async () => {
        // @ts-expect-error
        const game = await gamesService._createOne();
        game.state = GameState.ended;
        await game.save();

        const ch = await client.user.channel.createSubChannel(`${game.number}`);
        ch.users.push({});
      });

      afterEach(async () => {
        // @ts-expect-error
        await gamesService._reset();
      });

      it('should not remove the channel', async () => {
        await service.removeOldChannels();
        expect(client.user.channel.subChannels.length).toBe(1);
      });
    });

    describe('when the game is in progress', () => {
      beforeEach(async () => {
        // @ts-expect-error
        const game = await gamesService._createOne();
        game.state = GameState.started;
        await game.save();

        await client.user.channel.createSubChannel(`${game.number}`);
      });

      afterEach(async () => {
        // @ts-expect-error
        await gamesService._reset();
      });

      it('should not remove the channel', async () => {
        await service.removeOldChannels();
        expect(client.user.channel.subChannels.length).toBe(1);
      });
    });
  });
});
