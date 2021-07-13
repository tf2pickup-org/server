import { Environment } from '@/environment/environment';
import { Events } from '@/events/events';
import { GameServer } from '@/game-servers/models/game-server';
import { Game } from '@/games/models/game';
import { GameState } from '@/games/models/game-state';
import { Player, playerSchema } from '@/players/models/player';
import { PlayersService } from '@/players/services/players.service';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { typegooseTestingModule } from '@/utils/testing-typegoose-module';
import { MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Subject } from 'rxjs';
import { AdminNotificationsService } from './admin-notifications.service';
import { DiscordService } from './discord.service';

jest.mock('./discord.service');
jest.mock('@/players/services/players.service');

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

  beforeAll(() => (mongod = new MongoMemoryServer()));
  afterAll(async () => mongod.stop());

  beforeEach(() => {
    sentMessages = new Subject();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        typegooseTestingModule(mongod),
        MongooseModule.forFeature([
          {
            name: Player.name,
            schema: playerSchema,
          },
        ]),
      ],
      providers: [
        AdminNotificationsService,
        DiscordService,
        Events,
        { provide: Environment, useValue: environment },
        PlayersService,
      ],
    }).compile();

    service = module.get<AdminNotificationsService>(AdminNotificationsService);
    events = module.get(Events);
    playersService = module.get(PlayersService);
    discordService = module.get(DiscordService);
    sendSpy = jest
      .spyOn(discordService.getAdminsChannel(), 'send')
      .mockImplementation((message) => {
        sentMessages.next(message);
        return Promise.resolve(message);
      });
  });

  beforeEach(() => {
    service.onModuleInit();
  });

  // @ts-expect-error
  afterEach(async () => await playersService._reset());

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
    let player: Player;

    beforeEach(async () => {
      // @ts-expect-error
      player = await playersService._createOne();
      // @ts-expect-error
      admin = await playersService._createOne();
    });

    it('should send a message', async () =>
      new Promise<void>((resolve) => {
        sentMessages.subscribe((message) => {
          expect(message.embed).toBeTruthy();
          expect(message.embed.title).toEqual('Player profile updated');
          resolve();
        });

        events.playerUpdates.next({
          oldPlayer: player,
          newPlayer: {
            ...player,
            name: 'NEW_PLAYER_NAME',
            _links: [],
          },
          adminId: admin.id,
        });
      }));

    describe("when the update doesn't change anything", () => {
      it('should not send any messages', async () =>
        new Promise<void>((resolve) => {
          events.playerUpdates.next({
            oldPlayer: player,
            newPlayer: player,
            adminId: admin.id,
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

    it('should send a message', async () =>
      new Promise<void>((resolve) => {
        sentMessages.subscribe((message) => {
          expect(message.embed).toBeTruthy();
          expect(message.embed.title).toEqual('Player ban added');
          resolve();
        });

        events.playerBanAdded.next({
          ban: {
            player: player._id,
            admin: admin._id,
            start: new Date(),
            end: new Date(),
            reason: 'FAKE_BAN',
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

    it('should send a message', async () =>
      new Promise<void>((resolve) => {
        sentMessages.subscribe((message) => {
          expect(message.embed).toBeTruthy();
          expect(message.embed.title).toEqual('Player ban revoked');
          resolve();
        });

        events.playerBanRevoked.next({
          ban: {
            player: player._id,
            admin: admin._id,
            start: new Date(),
            end: new Date(),
            reason: 'FAKE_BAN',
          },
        });
      }));
  });

  describe('when the playerSkillChanged event emits', () => {
    let admin: Player;
    let player: Player;

    beforeEach(async () => {
      // @ts-expect-error
      player = await playersService._createOne();
      // @ts-expect-error
      admin = await playersService._createOne();
    });

    it('should send a message', async () =>
      new Promise<void>((resolve) => {
        sentMessages.subscribe((message) => {
          expect(message.embed).toBeTruthy();
          expect(message.embed.title).toEqual('Player skill updated');
          resolve();
        });

        const oldSkill = new Map([[Tf2ClassName.soldier, 2]]);
        const newSkill = new Map([[Tf2ClassName.soldier, 4]]);
        events.playerSkillChanged.next({
          playerId: player.id,
          oldSkill,
          newSkill,
          adminId: admin.id,
        });
      }));

    describe("when the skill doesn't really change", () => {
      it('should not send any message', async () =>
        new Promise<void>((resolve) => {
          const oldSkill = new Map([[Tf2ClassName.soldier, 2]]);
          events.playerSkillChanged.next({
            playerId: player.id,
            oldSkill,
            newSkill: oldSkill,
            adminId: admin.id,
          });
          setTimeout(() => {
            expect(sendSpy).not.toHaveBeenCalled();
            resolve();
          }, 1000);
        }));
    });
  });

  describe('when the gameServerAdded event emits', () => {
    let admin: Player;

    beforeEach(async () => {
      // @ts-expect-error
      admin = await playersService._createOne();
    });

    it('should send a message', async () =>
      new Promise<void>((resolve) => {
        sentMessages.subscribe((message) => {
          expect(message.embed).toBeTruthy();
          expect(message.embed.title).toEqual('Game server added');
          resolve();
        });

        events.gameServerAdded.next({
          gameServer: { name: 'fake game server' } as GameServer,
          adminId: admin.id,
        });
      }));
  });

  describe('when the gameServerRemoved event emits', () => {
    let admin: Player;

    beforeEach(async () => {
      // @ts-expect-error
      admin = await playersService._createOne();
    });

    it('should send a message', async () =>
      new Promise<void>((resolve) => {
        sentMessages.subscribe((message) => {
          expect(message.embed).toBeTruthy();
          expect(message.embed.title).toEqual('Game server removed');
          resolve();
        });

        events.gameServerRemoved.next({
          gameServer: { name: 'fake game server' } as GameServer,
          adminId: admin.id,
        });
      }));
  });

  describe('when a game is force-ended', () => {
    let admin: Player;

    beforeEach(async () => {
      // @ts-expect-error
      admin = await playersService._createOne();
    });

    it('should send a message', async () =>
      new Promise<void>((resolve) => {
        sentMessages.subscribe((message) => {
          expect(message.embed).toBeTruthy();
          expect(message.embed.title).toEqual('Game force-ended');
          resolve();
        });

        events.gameChanges.next({
          game: {
            number: 1,
            state: GameState.started,
            id: 'FAKE_GAME_ID',
          } as Game,
        });
        events.gameChanges.next({
          game: {
            number: 1,
            state: GameState.interrupted,
            id: 'FAKE_GAME_ID',
          } as Game,
          adminId: admin.id,
        });
      }));
  });
});
