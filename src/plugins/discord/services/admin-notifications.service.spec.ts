import { Test, TestingModule } from '@nestjs/testing';
import { AdminNotificationsService } from './admin-notifications.service';
import { Client, GatewayIntentBits, TextChannel } from '@mocks/discord.js';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { Events } from '@/events/events';
import { PlayersService } from '@/players/services/players.service';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, Types } from 'mongoose';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { Player, playerSchema } from '@/players/models/player';
import { Game, gameSchema } from '@/games/models/game';
// eslint-disable-next-line jest/no-mocks-import
import { PlayersService as PlayersServiceMock } from '@/players/services/__mocks__/players.service';
import { Environment } from '@/environment/environment';
import { StaticGameServersService } from '@/game-servers/providers/static-game-server/services/static-game-servers.service';
import { GamesService } from '@/games/services/games.service';
// eslint-disable-next-line jest/no-mocks-import
import { GamesService as GamesServiceMock } from '@/games/services/__mocks__/games.service';
import { Subject } from 'rxjs';
import { PlayerBanId } from '@/players/types/player-ban-id';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { StaticGameServer } from '@/game-servers/providers/static-game-server/models/static-game-server';
import { GameState } from '@/games/models/game-state';
import { DISCORD_CLIENT } from '../discord-client.token';

jest.mock('discord.js');
jest.mock('@/configuration/services/configuration.service');
jest.mock('@/players/services/players.service');
jest.mock(
  '@/game-servers/providers/static-game-server/services/static-game-servers.service',
);
jest.mock('@/games/services/games.service');

const environment = {
  clientUrl: 'http://localhost',
};

describe('AdminNotificationsService', () => {
  let service: AdminNotificationsService;
  let mongod: MongoMemoryServer;
  let connection: Connection;
  let playersService: PlayersServiceMock;
  let gamesService: GamesServiceMock;
  let configurationService: jest.Mocked<ConfigurationService>;
  let sentMessages: Subject<any>;
  let client: Client;
  let events: Events;
  let staticGameServersService: StaticGameServersService;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => await mongod.stop());

  beforeEach(() => {
    sentMessages = new Subject();
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
          {
            name: Player.name,
            schema: playerSchema,
          },
          {
            name: Game.name,
            schema: gameSchema,
          },
        ]),
      ],
      providers: [
        AdminNotificationsService,
        {
          provide: DISCORD_CLIENT,
          useValue: client,
        },
        ConfigurationService,
        Events,
        PlayersService,
        { provide: Environment, useValue: environment },
        StaticGameServersService,
        GamesService,
      ],
    }).compile();

    service = module.get<AdminNotificationsService>(AdminNotificationsService);
    connection = module.get(getConnectionToken());
    playersService = module.get(PlayersService);
    gamesService = module.get(GamesService);
    configurationService = module.get(ConfigurationService);
    events = module.get(Events);
    staticGameServersService = module.get(StaticGameServersService);
  });

  beforeEach(() => {
    configurationService.get.mockImplementation((key) =>
      Promise.resolve(
        {
          'discord.guilds': [
            {
              id: 'FAKE_GUILD_ID',
              adminNotifications: {
                channel: 'FAKE_ADMIN_CHANNEL_ID',
              },
            },
          ],
        }[key],
      ),
    );

    (staticGameServersService.gameServerAdded as Subject<any>) = new Subject();
    (staticGameServersService.gameServerUpdated as Subject<any>) =
      new Subject();

    const channel = new TextChannel('admin notifications');
    channel.send.mockImplementation((message) => {
      sentMessages.next(message);
      return Promise.resolve(message);
    });
    client.channels.cache.set('FAKE_ADMIN_CHANNEL_ID', channel);

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

  describe('when the client becomes ready', () => {
    it('should send a message to admins channel', () =>
      new Promise<void>((resolve) => {
        sentMessages.subscribe((message) => {
          expect(message).toMatch(/Server version (.+) started/);
          resolve();
        });

        client.emit('ready');
      }));
  });

  describe('when a player registers', () => {
    let player: Player;

    beforeEach(async () => {
      player = await playersService._createOne();
    });

    it('should send a notification to admins channel', () =>
      new Promise<void>((resolve) => {
        sentMessages.subscribe((message) => {
          expect(message.embeds.length).toBeGreaterThan(0);
          expect(message.embeds[0].toJSON().title).toEqual('New player');
          resolve();
        });
        events.playerRegisters.next({ player });
      }));
  });

  describe('when a player gets updated', () => {
    let admin: Player;
    let oldPlayer: Player;
    let newPlayer: Player;

    beforeEach(async () => {
      const playerId = (await playersService._createOne())._id;
      admin = await playersService._createOne();

      oldPlayer = await playersService.getById(playerId);
      newPlayer = await playersService.updatePlayer(playerId, {
        name: 'new player name',
      });
    });

    it('should send a notification to admins channel', () =>
      new Promise<void>((resolve) => {
        sentMessages.subscribe((message) => {
          expect(message.embeds.length).toBeGreaterThan(0);
          expect(message.embeds[0].toJSON().title).toEqual(
            'Player profile updated',
          );
          resolve();
        });

        events.playerUpdates.next({
          oldPlayer,
          newPlayer,
          adminId: admin._id,
        });
      }));
  });

  describe('when player ban gets added', () => {
    let admin: Player;
    let player: Player;

    beforeEach(async () => {
      admin = await playersService._createOne();
      player = await playersService._createOne();
    });

    it('should send a notification to admins channel', () =>
      new Promise<void>((resolve) => {
        sentMessages.subscribe((message) => {
          expect(message.embeds.length).toBeGreaterThan(0);
          expect(message.embeds[0].toJSON().title).toEqual('Player ban added');
          resolve();
        });

        events.playerBanAdded.next({
          ban: {
            _id: new Types.ObjectId() as PlayerBanId,
            id: 'FAKE_ID',
            player: player._id,
            admin: admin._id,
            start: new Date(),
            end: new Date(),
            reason: 'FAKE_BAN',
            serialize: jest.fn(),
          },
        });
      }));
  });

  describe('when player ban gets revoked', () => {
    let admin: Player;
    let player: Player;

    beforeEach(async () => {
      admin = await playersService._createOne();
      player = await playersService._createOne();
    });

    it('should send a notification to admins channel', () =>
      new Promise<void>((resolve) => {
        sentMessages.subscribe((message) => {
          expect(message.embeds.length).toBe(1);
          expect(message.embeds[0].toJSON().title).toEqual(
            'Player ban revoked',
          );
          resolve();
        });

        events.playerBanRevoked.next({
          ban: {
            _id: new Types.ObjectId() as PlayerBanId,
            id: 'FAKE_ID',
            player: player._id,
            admin: admin._id,
            start: new Date(),
            end: new Date(),
            reason: 'FAKE_BAN',
            serialize: jest.fn(),
          },
          adminId: admin._id,
        });
      }));
  });

  describe('when player skill changes', () => {
    let admin: Player;
    let oldPlayer: Player;
    let newPlayer: Player;

    beforeEach(async () => {
      const playerId = (await playersService._createOne()).id;

      oldPlayer = await playersService.updatePlayer(playerId, {
        skill: new Map([[Tf2ClassName.soldier, 2]]),
      });
      newPlayer = await playersService.updatePlayer(playerId, {
        skill: new Map([[Tf2ClassName.soldier, 4]]),
      });

      admin = await playersService._createOne();
    });

    it('should send a notification to admins channel', () =>
      new Promise<void>((resolve) => {
        sentMessages.subscribe((message) => {
          expect(message.embeds[0].toJSON().title).toEqual(
            'Player skill updated',
          );
          resolve();
        });

        events.playerUpdates.next({
          oldPlayer,
          newPlayer,
          adminId: admin._id,
        });
      }));
  });

  describe('when the gameServerAdded event emits', () => {
    it('should send a notification to admins channel', () =>
      new Promise<void>((resolve) => {
        sentMessages.subscribe((message) => {
          expect(message.embeds[0].toJSON().title).toEqual('Game server added');
          resolve();
        });

        staticGameServersService.gameServerAdded.next({
          name: 'fake game server',
        } as StaticGameServer);
      }));
  });

  describe('when the game server goes offline', () => {
    it('should send a notification to admins channel', () => {
      sentMessages.subscribe((message) => {
        expect(message.embeds[0].toJSON().title).toEqual(
          'Game server is offline',
        );
      });

      staticGameServersService.gameServerUpdated.next({
        oldGameServer: {
          name: 'fake game server',
          isOnline: true,
        } as StaticGameServer,
        newGameServer: {
          name: 'fake game server',
          isOnline: false,
        } as StaticGameServer,
      });
    });
  });

  describe('when the game server comes back online', () => {
    it('should send a notification to admins channel', () => {
      sentMessages.subscribe((message) => {
        expect(message.embeds[0].toJSON().title).toEqual(
          'Game server is back online',
        );
      });

      staticGameServersService.gameServerUpdated.next({
        oldGameServer: {
          name: 'fake game server',
          isOnline: false,
        } as StaticGameServer,
        newGameServer: {
          name: 'fake game server',
          isOnline: true,
        } as StaticGameServer,
      });
    });
  });

  describe('when a game is force-ended', () => {
    let admin: Player;

    beforeEach(async () => {
      admin = await playersService._createOne();
    });

    it('should send a notification to admins channel', () =>
      new Promise<void>((resolve) => {
        sentMessages.subscribe((message) => {
          expect(message.embeds[0].toJSON().title).toEqual('Game force-ended');
          resolve();
        });

        events.gameChanges.next({
          oldGame: {
            number: 1,
            state: GameState.started,
            id: 'FAKE_GAME_ID',
          } as Game,
          newGame: {
            number: 1,
            state: GameState.interrupted,
            id: 'FAKE_GAME_ID',
          } as Game,
          adminId: admin._id,
        });
      }));
  });

  describe('when a player substitute is requested', () => {
    let admin: Player;
    let player: Player;
    let game: Game;

    beforeEach(async () => {
      admin = await playersService._createOne();
      player = await playersService._createOne();
      game = await gamesService._createOne();
    });

    it('should send a notification to admins channel', () =>
      new Promise<void>((resolve) => {
        sentMessages.subscribe((message) => {
          expect(message.embeds[0].toJSON().title).toEqual(
            'Substitute requested',
          );
          resolve();
        });

        events.substituteRequested.next({
          gameId: game._id,
          playerId: player._id,
          adminId: admin._id,
        });
      }));
  });

  describe('when maps are scrambled', () => {
    let actor: Player;

    beforeEach(async () => {
      actor = await playersService._createOne();
    });

    it('should send a notification to admins channel', () =>
      new Promise<void>((resolve) => {
        sentMessages.subscribe((message) => {
          expect(message.embeds[0].toJSON().title).toEqual('Maps scrambled');
          resolve();
        });

        events.mapsScrambled.next({
          mapOptions: ['cp_badlands', 'cp_process_final', 'cp_granary_pro_rc8'],
          actorId: actor._id,
        });
      }));
  });
});
