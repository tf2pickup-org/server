import { Test, TestingModule } from '@nestjs/testing';
import { PlayerSubsNotificationsService } from './player-subs-notifications.service';
import { Events } from '@/events/events';
import {
  Client,
  GatewayIntentBits,
  Message,
  Role,
  TextChannel,
} from '@mocks/discord.js';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { Environment } from '@/environment/environment';
import { CacheModule } from '@nestjs/cache-manager';
import { GamesService } from '@/games/services/games.service';
import { Game, gameSchema } from '@/games/models/game';
import { Player, playerSchema } from '@/players/models/player';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, Types } from 'mongoose';
// eslint-disable-next-line jest/no-mocks-import
import { GamesService as GamesServiceMock } from '@/games/services/__mocks__/games.service';
import { PlayersService } from '@/players/services/players.service';
// eslint-disable-next-line jest/no-mocks-import
import { PlayersService as PlayersServiceMock } from '@/players/services/__mocks__/players.service';
import { PlayerId } from '@/players/types/player-id';
import { GameState } from '@/games/models/game-state';
import { SlotStatus } from '@/games/models/slot-status';
import { DISCORD_CLIENT } from '../discord-client.token';

jest.mock('@/configuration/services/configuration.service');
jest.mock('@/games/services/games.service');
jest.mock('@/players/services/players.service');

const environment = {
  clientUrl: 'http://localhost',
};

describe('PlayerSubsNotificationsService', () => {
  let service: PlayerSubsNotificationsService;
  let events: Events;
  let client: Client;
  let mongod: MongoMemoryServer;
  let connection: Connection;
  let gamesService: GamesServiceMock;
  let playersService: PlayersServiceMock;
  let configurationService: jest.Mocked<ConfigurationService>;
  let channel: TextChannel;

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
        PlayerSubsNotificationsService,
        Events,
        {
          provide: DISCORD_CLIENT,
          useValue: client,
        },
        ConfigurationService,
        { provide: Environment, useValue: environment },
        GamesService,
        PlayersService,
      ],
    }).compile();

    service = module.get<PlayerSubsNotificationsService>(
      PlayerSubsNotificationsService,
    );
    events = module.get(Events);
    connection = module.get(getConnectionToken());
    gamesService = module.get(GamesService);
    playersService = module.get(PlayersService);
    configurationService = module.get(ConfigurationService);
  });

  beforeEach(() => {
    configurationService.get.mockImplementation((key) =>
      Promise.resolve(
        {
          'discord.guilds': [
            {
              id: 'guild1',
              substituteNotifications: {
                channel: 'FAKE_PLAYERS_CHANNEL_ID',
                role: 'FAKE_PLAYERS_ROLE',
              },
            },
          ],
        }[key],
      ),
    );

    channel = new TextChannel('players');
    client.guilds.cache
      .get('guild1')
      .channels.cache.set('FAKE_PLAYERS_CHANNEL_ID', channel);
    client.guilds.cache
      .get('guild1')
      .roles.cache.set('FAKE_PLAYERS_ROLE', new Role('players'));

    service.onModuleInit();
  });

  afterEach(async () => {
    await playersService._reset();
    await gamesService._reset();
    await connection.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('when a sub is requested', () => {
    let game: Game;
    let player: Player;

    beforeEach(async () => {
      player = await playersService._createOne();
      game = await gamesService._createOne([player]);

      await gamesService.update(game._id, {
        'slots.0.status': SlotStatus.waitingForSubstitute,
      });
    });

    it('should notify all players', () =>
      new Promise<void>((resolve) => {
        channel.send.mockImplementation((message) => {
          expect(message.content).toEqual('&<players>');
          expect(message.embeds[0].toJSON().title).toEqual(
            'A substitute is needed',
          );
          setImmediate(() => resolve());
          return {
            id: 'FAKE_MESSAGE_ID',
          };
        });

        events.substituteRequested.next({
          gameId: game._id,
          playerId: player._id,
        });
      }));
  });

  describe('when a message to players is sent', () => {
    let game: Game;
    let player: Player;
    let message: Message;

    beforeEach(async () => {
      player = await playersService._createOne();
      game = await gamesService._createOne([player]);
      await gamesService.update(game._id, {
        'slots.0.status': SlotStatus.waitingForSubstitute,
      });
    });

    beforeEach(
      () =>
        new Promise<void>((resolve) => {
          const originalSend = channel.send.getMockImplementation();
          channel.send.mockImplementation(async () => {
            message = await originalSend!();
            setImmediate(() => resolve());
            return message;
          });

          events.substituteRequested.next({
            gameId: game._id,
            playerId: player._id,
          });
        }),
    );

    describe('and when the sub request is canceled', () => {
      beforeEach(async () => {
        await gamesService.update(game._id, {
          'slots.0.status': SlotStatus.active,
        });
      });

      it('should edit the message', () =>
        new Promise<void>((resolve) => {
          message.edit.mockImplementation((message) => {
            expect(message.embeds[0].toJSON().title).toEqual(
              'A substitute was needed',
            );
            resolve();
          });

          events.substituteRequestCanceled.next({
            gameId: game._id,
            playerId: player._id,
          });
        }));
    });

    describe('and when sub gets taken', () => {
      beforeEach(async () => {
        await gamesService.update(game._id, {
          'slots.0.status': SlotStatus.replaced,
        });
      });

      it('should edit the message', () =>
        new Promise<void>((resolve) => {
          message.edit.mockImplementation((message) => {
            expect(message.embeds[0].toJSON().title).toEqual(
              'A substitute was needed',
            );
            resolve();
          });

          events.playerReplaced.next({
            gameId: game._id,
            replaceeId: player._id,
            replacementId: new Types.ObjectId() as PlayerId,
          });
        }));
    });

    describe('and when the game ends', () => {
      it('should edit the message', () =>
        new Promise<void>((resolve) => {
          message.edit.mockImplementation((message) => {
            expect(message.embeds[0].toJSON().title).toEqual(
              'A substitute was needed',
            );
            resolve();
          });

          gamesService.update(game._id, {
            $set: {
              state: GameState.ended,
              'slots.$[].status': SlotStatus.active,
            },
          });
        }));
    });
  });
});
