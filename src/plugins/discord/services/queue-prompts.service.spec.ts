import { Test, TestingModule } from '@nestjs/testing';
import { QueuePromptsService } from './queue-prompts.service';
import { Events } from '@/events/events';
import { Environment } from '@/environment/environment';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { PlayersService } from '@/players/services/players.service';
import {
  Client,
  GatewayIntentBits,
  Message,
  TextChannel,
} from '@mocks/discord.js';
import { CACHE_MANAGER, CacheModule } from '@nestjs/cache-manager';
import { Game, gameSchema } from '@/games/models/game';
import { Player, playerSchema } from '@/players/models/player';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, Types } from 'mongoose';
// eslint-disable-next-line jest/no-mocks-import
import { PlayersService as PlayersServiceMock } from '@/players/services/__mocks__/players.service';
import { QueueService } from '@/queue/services/queue.service';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { Cache } from 'cache-manager';

jest.mock('@/configuration/services/configuration.service');
jest.mock('@/players/services/players.service');
jest.mock('@/queue/services/queue.service');

const environment = {
  clientUrl: 'http://localhost',
};

describe('QueuePromptsService', () => {
  let service: QueuePromptsService;
  let client: Client;
  let mongod: MongoMemoryServer;
  let connection: Connection;
  let playersService: PlayersServiceMock;
  let configurationService: jest.Mocked<ConfigurationService>;
  let channel: TextChannel;
  let players: Player[];
  let cache: Cache;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => await mongod.stop());

  beforeEach(() => {
    client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildMessages,
      ],
    });
  });

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
            classes: [{ name: 'soldier', count: 2 }],
            teamCount: 2,
          },
        },
        PlayersService,
        {
          provide: 'DISCORD_CLIENT',
          useValue: client,
        },
        QueueService,
      ],
    }).compile();

    service = module.get<QueuePromptsService>(QueuePromptsService);
    connection = module.get(getConnectionToken());
    playersService = module.get(PlayersService);
    configurationService = module.get(ConfigurationService);
    cache = module.get(CACHE_MANAGER);
  });

  beforeEach(async () => {
    players = await Promise.all([
      playersService._createOne(),
      playersService._createOne(),
      playersService._createOne(),
      playersService._createOne(),
    ]);
    configurationService.get.mockImplementation((key) =>
      Promise.resolve(
        {
          'discord.guilds': [
            {
              id: 'guild1',
              queuePrompts: {
                channel: 'FAKE_PLAYERS_CHANNEL_ID',
              },
            },
          ],
        }[key],
      ),
    );

    channel = new TextChannel('players');
    channel.guildId = 'guild1';
    client.channels.cache.set('FAKE_PLAYERS_CHANNEL_ID', channel);

    service.onModuleInit();
  });

  afterEach(async () => {
    await playersService._reset();
    await connection.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#refreshPrompt()', () => {
    describe('when a prompt was not sent before', () => {
      describe('but the threshold is met', () => {
        it('should send the prompt', async () => {
          await service.refreshPrompt([
            {
              id: 1,
              gameClass: Tf2ClassName.soldier,
              playerId: players[0]._id,
            },
            {
              id: 2,
              gameClass: Tf2ClassName.soldier,
              playerId: players[1]._id,
            },
            {
              id: 3,
              gameClass: Tf2ClassName.soldier,
              playerId: null,
            },
            {
              id: 4,
              gameClass: Tf2ClassName.soldier,
              playerId: null,
            },
          ]);
          expect(channel.send).toHaveBeenCalled();
          const args = channel.send.mock.calls[0][0];
          expect(args.embeds[0].toJSON().title).toMatch(
            /2\/4 players in the queue!/,
          );
        });
      });

      describe('and the threshold is not met', () => {
        it('should not send the prompt', async () => {
          await service.refreshPrompt([
            {
              id: 1,
              gameClass: Tf2ClassName.soldier,
              playerId: players[0]._id,
            },
            {
              id: 2,
              gameClass: Tf2ClassName.soldier,
              playerId: null,
            },
            {
              id: 3,
              gameClass: Tf2ClassName.soldier,
              playerId: null,
            },
            {
              id: 4,
              gameClass: Tf2ClassName.soldier,
              playerId: null,
            },
          ]);
          expect(channel.send).not.toHaveBeenCalled();
        });
      });
    });

    describe('when a prompt was sent before', () => {
      let message: Message;

      beforeEach(async () => {
        message = new Message();
        channel.messages.cache.set(message.id, message);
        await cache.set('queue-prompt-message-id/guild1', message.id);
      });

      it('should edit the message', async () => {
        await service.refreshPrompt([
          {
            id: 1,
            gameClass: Tf2ClassName.soldier,
            playerId: players[0]._id,
          },
          {
            id: 2,
            gameClass: Tf2ClassName.soldier,
            playerId: players[1]._id,
          },
          {
            id: 3,
            gameClass: Tf2ClassName.soldier,
            playerId: null,
          },
          {
            id: 4,
            gameClass: Tf2ClassName.soldier,
            playerId: null,
          },
        ]);
        expect(message.edit).toHaveBeenCalled();
        const args = message.edit.mock.calls[0][0];
        expect(args.embeds[0].toJSON().title).toMatch(
          /2\/4 players in the queue!/,
        );
      });
    });
  });
});
