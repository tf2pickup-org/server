import { Environment } from '@/environment/environment';
import { Events } from '@/events/events';
import { Player } from '@/players/models/player';
import { PlayersService } from '@/players/services/players.service';
import { typegooseTestingModule } from '@/utils/testing-typegoose-module';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { TypegooseModule } from 'nestjs-typegoose';
import { Subject } from 'rxjs';
import { AdminNotificationsService } from './admin-notifications.service';
import { DiscordService } from './discord.service';

jest.mock('./discord.service');
jest.mock('@/players/services/players.service');

const environment = {
  clientUrl: 'http://localhost',
}

describe('AdminNotificationsService', () => {
  let service: AdminNotificationsService;
  let mongod: MongoMemoryServer;
  let events: Events;
  let playersService: PlayersService;
  let discordService: DiscordService;
  let sendSpy: jest.SpyInstance;
  let sentMessages: Subject<any>;

  beforeAll(() => mongod = new MongoMemoryServer());
  afterAll(async () => mongod.stop());

  beforeEach(() => {
    sentMessages = new Subject();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        typegooseTestingModule(mongod),
        TypegooseModule.forFeature([ Player ]),
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
    sendSpy = jest.spyOn(discordService.getAdminsChannel(), 'send').mockImplementation(message => {
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

    it('should send a message', async () => new Promise<void>(resolve => {
      sentMessages.subscribe(message => {
        expect(message.embed).toBeTruthy();
        expect(message.embed.title).toEqual('Player profile updated');
        resolve();
      });

      events.playerUpdates.next({ oldPlayer: player, newPlayer: { ...player, name: 'NEW_PLAYER_NAME' }, adminId: admin.id });
    }));
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

    it('should send a message', async () => new Promise<void>(resolve => {
      sentMessages.subscribe(message => {
        expect(message.embed).toBeTruthy();
        expect(message.embed.title).toEqual('Player ban added');
        resolve();
      });

      events.playerBanAdded.next({ ban: { player, admin, start: new Date(), end: new Date(), reason: 'FAKE_BAN' } });
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

    it('should send a message', async () => new Promise<void>(resolve => {
      sentMessages.subscribe(message => {
        expect(message.embed).toBeTruthy();
        expect(message.embed.title).toEqual('Player ban revoked');
        resolve();
      });

      events.playerBanRevoked.next({ ban: { player, admin, start: new Date(), end: new Date(), reason: 'FAKE_BAN' } });
    }));
  });
});
