import { Environment } from '@/environment/environment';
import { Events } from '@/events/events';
import { StaticGameServer } from '@/game-servers/providers/static-game-server/models/static-game-server';
import { StaticGameServersService } from '@/game-servers/providers/static-game-server/services/static-game-servers.service';
import { Game, gameSchema } from '@/games/models/game';
import { GameState } from '@/games/models/game-state';
import { GamesService } from '@/games/services/games.service';
import { Player, playerSchema } from '@/players/models/player';
import { PlayersService } from '@/players/services/players.service';
import { PlayerBanId } from '@/players/types/player-ban-id';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import { getConnectionToken, MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { TextChannel } from 'discord.js';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, Types } from 'mongoose';
import { Subject } from 'rxjs';
import { AdminNotificationsService } from './admin-notifications.service';
import { DiscordService } from './discord.service';

jest.mock('./discord.service');
jest.mock('@/players/services/players.service');
jest.mock('@/games/services/games.service');
jest.mock(
  '@/game-servers/providers/static-game-server/services/static-game-servers.service',
);

const environment = {
  clientUrl: 'http://localhost',
};

describe('AdminNotificationsService', () => {
  let service: AdminNotificationsService;
  let mongod: MongoMemoryServer;
  let events: Events;
  let playersService: PlayersService;
  let discordService: DiscordService;
  let sendSpy: jest.SpyInstance;
  let sentMessages: Subject<any>;
  let connection: Connection;
  let gamesService: GamesService;
  let staticGameServersService: StaticGameServersService;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => await mongod.stop());

  beforeEach(() => {
    sentMessages = new Subject();
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
        DiscordService,
        Events,
        { provide: Environment, useValue: environment },
        PlayersService,
        GamesService,
        StaticGameServersService,
      ],
    }).compile();

    service = module.get<AdminNotificationsService>(AdminNotificationsService);
    events = module.get(Events);
    playersService = module.get(PlayersService);
    discordService = module.get(DiscordService);
    connection = module.get(getConnectionToken());
    gamesService = module.get(GamesService);
    staticGameServersService = module.get(StaticGameServersService);
    (staticGameServersService.gameServerAdded as Subject<any>) = new Subject();
    (staticGameServersService.gameServerUpdated as Subject<any>) =
      new Subject();
    sendSpy = jest
      .spyOn(discordService.getAdminsChannel() as TextChannel, 'send')
      .mockImplementation((message: any) => {
        sentMessages.next(message);
        return Promise.resolve(message);
      });
  });

  beforeEach(() => {
    service.onModuleInit();
  });

  afterEach(async () => {
    // @ts-expect-error
    await playersService._reset();
    await connection.close();
  });

  afterEach(() => {
    sentMessages.complete();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should handle playerRegisters event', async () => {
    // @ts-expect-error
    const player = await playersService._createOne();

    events.playerRegisters.next({ player });
    expect(sendSpy).toHaveBeenCalledTimes(1);
  });

  describe('when the playerUpdates event emits', () => {
    let admin: Player;
    let oldPlayer: Player;
    let newPlayer: Player;

    beforeEach(async () => {
      // @ts-expect-error
      const playerId = (await playersService._createOne()).id;
      // @ts-expect-error
      admin = await playersService._createOne();

      oldPlayer = await playersService.getById(playerId);
      newPlayer = await playersService.updatePlayer(playerId, {
        name: 'NEW_PLAYER_NAME',
      });
    });

    it('should send a message', () =>
      new Promise<void>((resolve) => {
        sentMessages.subscribe((message) => {
          expect(message.embeds.length).toBeGreaterThan(0);
          expect(message.embeds[0].title).toEqual('Player profile updated');
          resolve();
        });

        events.playerUpdates.next({
          oldPlayer,
          newPlayer,
          adminId: admin._id,
        });
      }));

    describe("when the update doesn't change anything", () => {
      it('should not send any messages', () =>
        new Promise<void>((resolve) => {
          events.playerUpdates.next({
            oldPlayer,
            newPlayer: oldPlayer,
            adminId: admin._id,
          });
          setTimeout(() => {
            expect(sendSpy).not.toHaveBeenCalled();
            resolve();
          }, 1000);
        }));
    });
  });

  describe('when the playerBanAdded event emits', () => {
    let admin: Player;
    let player: Player;

    beforeEach(async () => {
      // @ts-expect-error
      player = await playersService._createOne();
      // @ts-expect-error
      admin = await playersService._createOne();
    });

    it('should send a message', () =>
      new Promise<void>((resolve) => {
        sentMessages.subscribe((message) => {
          expect(message.embeds.length).toBeGreaterThan(0);
          expect(message.embeds[0].title).toEqual('Player ban added');
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

  describe('when the playerBanRevoked event emits', () => {
    let admin: Player;
    let player: Player;

    beforeEach(async () => {
      // @ts-expect-error
      player = await playersService._createOne();
      // @ts-expect-error
      admin = await playersService._createOne();
    });

    it('should send a message', () =>
      new Promise<void>((resolve) => {
        sentMessages.subscribe((message) => {
          expect(message.embeds.length).toBe(1);
          expect(message.embeds[0].title).toEqual('Player ban revoked');
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

  describe('when the skill changes', () => {
    let admin: Player;
    let oldPlayer: Player;
    let newPlayer: Player;

    beforeEach(async () => {
      // @ts-expect-error
      const playerId = (await playersService._createOne()).id;

      oldPlayer = await playersService.updatePlayer(playerId, {
        skill: new Map([[Tf2ClassName.soldier, 2]]),
      });
      newPlayer = await playersService.updatePlayer(playerId, {
        skill: new Map([[Tf2ClassName.soldier, 4]]),
      });

      // @ts-expect-error
      admin = await playersService._createOne();
    });

    it('should send a message', () =>
      new Promise<void>((resolve) => {
        sentMessages.subscribe((message) => {
          expect(message.embeds[0].title).toEqual('Player skill updated');
          resolve();
        });

        events.playerUpdates.next({
          oldPlayer,
          newPlayer,
          adminId: admin._id,
        });
      }));

    describe("when the skill doesn't really change", () => {
      it('should not send any message', () =>
        new Promise<void>((resolve) => {
          events.playerUpdates.next({
            oldPlayer,
            newPlayer: oldPlayer,
            adminId: admin._id,
          });
          setTimeout(() => {
            expect(sendSpy).not.toHaveBeenCalled();
            resolve();
          }, 1000);
        }));
    });
  });

  describe('when the gameServerAdded event emits', () => {
    it('should send a message', () =>
      new Promise<void>((resolve) => {
        sentMessages.subscribe((message) => {
          expect(message.embeds[0].title).toEqual('Game server added');
          resolve();
        });

        staticGameServersService.gameServerAdded.next({
          name: 'fake game server',
        } as StaticGameServer);
      }));
  });

  describe('when the gameServer goes offline', () => {
    it('should send a message', () => {
      sentMessages.subscribe((message) => {
        expect(message.embeds[0].title).toEqual('Game server is offline');
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

  describe('when the gameServer comes back online', () => {
    it('should send a message', () => {
      sentMessages.subscribe((message) => {
        expect(message.embeds[0].title).toEqual('Game server is back online');
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
      // @ts-expect-error
      admin = await playersService._createOne();
    });

    it('should send a message', () =>
      new Promise<void>((resolve) => {
        sentMessages.subscribe((message) => {
          expect(message.embeds[0].title).toEqual('Game force-ended');
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
      // @ts-expect-error
      admin = await playersService._createOne();

      // @ts-expect-error
      player = await playersService._createOne();

      // @ts-expect-error
      game = await gamesService._createOne();
    });

    it('should send a notification', () =>
      new Promise<void>((resolve) => {
        sentMessages.subscribe((message) => {
          expect(message.embeds[0].title).toEqual('Substitute requested');
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
      // @ts-expect-error
      actor = await playersService._createOne();
    });

    it('should send a notification', () =>
      new Promise<void>((resolve) => {
        sentMessages.subscribe((message) => {
          expect(message.embeds[0].title).toEqual('Maps scrambled');
          resolve();
        });

        events.mapsScrambled.next({
          mapOptions: ['cp_badlands', 'cp_process_final', 'cp_granary_pro_rc8'],
          actorId: actor._id,
        });
      }));
  });
});
