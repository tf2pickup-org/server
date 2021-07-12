import { Test, TestingModule } from '@nestjs/testing';
import { PlayersService } from './players.service';
import { Environment } from '@/environment/environment';
import { Etf2lProfileService } from './etf2l-profile.service';
import { SteamProfile } from '../steam-profile';
import { GamesService } from '@/games/services/games.service';
import { OnlinePlayersService } from './online-players.service';
import { Etf2lProfile } from '../etf2l-profile';
import { Player, PlayerDocument, playerSchema } from '../models/player';
import { typegooseTestingModule } from '@/utils/testing-typegoose-module';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { SteamApiService } from './steam-api.service';
import { ObjectId } from 'mongodb';
import { Events } from '@/events/events';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { WebsocketEvent } from '@/websocket-event';
import { Socket } from 'socket.io';
import { InsufficientTf2InGameHoursError } from '../errors/insufficient-tf2-in-game-hours.error';
import { Tf2InGameHoursVerificationError } from '../errors/tf2-in-game-hours-verification.error';
import { PlayerRole } from '../models/player-role';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { Error, Model } from 'mongoose';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';

jest.mock('./etf2l-profile.service');
jest.mock('./online-players.service');
jest.mock('@/configuration/services/configuration.service');

class EnvironmentStub {
  superUser = null;
  botName = 'FAKE_BOT_NAME';
}

class GamesServiceStub {
  classCount = {
    scout: 19,
    soldier: 102,
    demoman: 0,
    medic: 92,
  };

  getPlayerGameCount(playerId: string, options: any) {
    return 220;
  }
  getPlayerPlayedClassCount(playerId: string) {
    return this.classCount;
  }
}

class SteamApiServiceStub {
  getTf2InGameHours(steamId64: string) {
    return Promise.resolve(800);
  }
}

describe('PlayersService', () => {
  let service: PlayersService;
  let mongod: MongoMemoryServer;
  let playerModel: Model<PlayerDocument>;
  let mockPlayer: PlayerDocument;
  let environment: EnvironmentStub;
  let etf2lProfileService: jest.Mocked<Etf2lProfileService>;
  let gamesService: GamesServiceStub;
  let onlinePlayersService: jest.Mocked<OnlinePlayersService>;
  let steamApiService: SteamApiServiceStub;
  let events: Events;
  let socket: Socket;
  let configurationService: jest.Mocked<ConfigurationService>;

  beforeAll(() => (mongod = new MongoMemoryServer()));
  afterAll(async () => await mongod.stop());

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
        PlayersService,
        { provide: Environment, useClass: EnvironmentStub },
        Etf2lProfileService,
        { provide: GamesService, useClass: GamesServiceStub },
        OnlinePlayersService,
        { provide: SteamApiService, useClass: SteamApiServiceStub },
        Events,
        ConfigurationService,
      ],
    }).compile();

    service = module.get<PlayersService>(PlayersService);
    playerModel = module.get(getModelToken(Player.name));
    environment = module.get(Environment);
    etf2lProfileService = module.get(Etf2lProfileService);
    gamesService = module.get(GamesService);
    onlinePlayersService = module.get(OnlinePlayersService);
    steamApiService = module.get(SteamApiService);
    events = module.get(Events);
    configurationService = module.get(ConfigurationService);
  });

  beforeEach(async () => {
    mockPlayer = await playerModel.create({
      name: 'FAKE_PLAYER_NAME',
      steamId: 'FAKE_STEAM_ID',
      etf2lProfileId: 123456,
      hasAcceptedRules: true,
    });

    etf2lProfileService.fetchPlayerInfo.mockResolvedValue({
      // http://api.etf2l.org/player/112758
      bans: null,
      classes: ['Soldier', 'Medic'],
      country: 'Poland',
      id: 112758,
      name: 'maly',
    });

    socket = { emit: jest.fn() } as any;
    onlinePlayersService.getSocketsForPlayer.mockReturnValue([socket]);
  });

  beforeEach(async () => {
    await service.onModuleInit();
  });

  afterEach(async () => await playerModel.deleteMany({}));

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create the bot user', async () => {
    expect(await playerModel.findOne({ name: 'FAKE_BOT_NAME' })).toBeTruthy();
  });

  describe('#getAll()', () => {
    it('should retrieve all players from the database', async () => {
      const ret = await service.getAll();
      expect(ret.length).toEqual(1);
      expect(ret[0].id).toEqual(mockPlayer.id.toString());
    });

    describe('when the bot user is created', () => {
      beforeEach(async () => {
        await service.onModuleInit();
      });

      it('should exclude the bot from the player list', async () => {
        const ret = await service.getAll();
        expect(ret.length).toEqual(1);
      });
    });
  });

  describe('#getById()', () => {
    it('should retrieve the player from the database', async () => {
      const player = await service.getById(mockPlayer.id);
      expect(player.id).toEqual(mockPlayer.id.toString());
    });
  });

  describe('#findBySteamId()', () => {
    it('should query playerModel', async () => {
      const player = await service.findBySteamId('FAKE_STEAM_ID');
      expect(player.id).toEqual(mockPlayer.id.toString());
    });
  });

  describe('#findByEtf2lProfileId()', () => {
    it('should query playerModel', async () => {
      const player = await service.findByEtf2lProfileId(123456);
      expect(player.id).toEqual(mockPlayer.id.toString());
    });
  });

  describe('#findBot()', () => {
    it('should find the bot', async () => {
      expect(await service.findBot()).toMatchObject({
        name: 'FAKE_BOT_NAME',
        roles: [PlayerRole.bot],
      });
    });
  });

  describe('#createPlayer()', () => {
    const mockSteamProfile: SteamProfile = {
      provider: 'steam',
      id: 'FAKE_STEAM_ID_2',
      displayName: 'FAKE_DISPLAY_NAME',
      photos: [
        { value: 'FAKE_SMALL_AVATAR_URL' },
        { value: 'FAKE_MEDIUM_AVATAR_URL' },
        { value: 'FAKE_FULL_AVATAR_URL' },
      ],
    };

    beforeEach(() => {
      configurationService.isEtf2lAccountRequired.mockResolvedValue(true);
      configurationService.getMinimumTf2InGameHours.mockResolvedValue(500);
    });

    describe("when an ETF2L profile doesn't exist", () => {
      beforeEach(() => {
        etf2lProfileService.fetchPlayerInfo.mockRejectedValue(
          new Error('no etf2l profile'),
        );
      });

      it('should deny creating tf2pickup.pl profile', async () => {
        await expect(
          service.createPlayer(mockSteamProfile),
        ).rejects.toThrowError('no etf2l profile');
      });
    });

    describe('when the user has an ETF2L ban', () => {
      // http://api.etf2l.org/player/129205
      const blacklistedProfile: Etf2lProfile = {
        bans: [
          {
            end: 4294967295,
            reason: 'Blacklisted',
            start: 0,
          },
        ],
        classes: ['Scout', 'Soldier', 'Sniper'],
        country: 'Russia',
        id: 129205,
        name: 'Tixx',
      };

      beforeEach(() => {
        etf2lProfileService.fetchPlayerInfo.mockResolvedValue(
          blacklistedProfile,
        );
      });

      it('should deny creating tf2pickup.pl profile', async () => {
        await expect(
          service.createPlayer(mockSteamProfile),
        ).rejects.toThrowError('this account is banned on ETF2L');
      });
    });

    it('should create new player', async () => {
      const ret = await service.createPlayer(mockSteamProfile);
      expect(ret).toMatchObject({
        steamId: 'FAKE_STEAM_ID_2',
        name: 'maly',
        avatar: {
          small: 'FAKE_SMALL_AVATAR_URL',
          medium: 'FAKE_MEDIUM_AVATAR_URL',
          large: 'FAKE_FULL_AVATAR_URL',
        },
        roles: [],
        etf2lProfileId: 112758,
      });
    });

    it('should assign the super-user role', async () => {
      environment.superUser = 'FAKE_STEAM_ID_2';
      const ret = await service.createPlayer(mockSteamProfile);
      expect(ret.roles.includes(PlayerRole.superUser)).toBe(true);
    });

    it('should emit the playerRegisters event', async () =>
      new Promise<void>((resolve) => {
        events.playerRegisters.subscribe(({ player }) => {
          expect(player).toBeTruthy();
          expect(player.steamId).toEqual(mockSteamProfile.id);
          resolve();
        });
        service.createPlayer(mockSteamProfile);
      }));

    describe('when TF2 in-game hours requirements are not met', () => {
      beforeEach(() => {
        jest.spyOn(steamApiService, 'getTf2InGameHours').mockResolvedValue(400);
      });

      it('should deny', async () => {
        await expect(service.createPlayer(mockSteamProfile)).rejects.toThrow(
          InsufficientTf2InGameHoursError,
        );
      });
    });

    describe('when TF2 in-game hours could not be fetched', () => {
      beforeEach(() => {
        jest
          .spyOn(steamApiService, 'getTf2InGameHours')
          .mockRejectedValue(new Tf2InGameHoursVerificationError(''));
      });

      it('should deny', async () => {
        await expect(service.createPlayer(mockSteamProfile)).rejects.toThrow(
          Tf2InGameHoursVerificationError,
        );
      });

      describe('and nobody cares', () => {
        beforeEach(() => {
          configurationService.getMinimumTf2InGameHours.mockResolvedValue(0);
        });

        it('should pass', async () => {
          await expect(
            service.createPlayer(mockSteamProfile),
          ).resolves.toBeTruthy();
        });
      });
    });
  });

  describe('#forceCreatePlayer()', () => {
    it('should create player', async () => {
      const player = await service.forceCreatePlayer({
        name: 'FAKE_FORCE_PLAYER_NAME',
        steamId: 'FAKE_FORCE_STEAM_ID',
      });
      expect(player).toMatchObject({
        name: 'FAKE_FORCE_PLAYER_NAME',
        steamId: 'FAKE_FORCE_STEAM_ID',
      });
      expect(await playerModel.findById(player._id)).toBeTruthy();
    });

    describe('when the player has ETF2L account', () => {
      it('should automatically assign ETF2L id', async () => {
        const player = await service.forceCreatePlayer({
          name: 'FAKE_FORCE_PLAYER_NAME',
          steamId: 'FAKE_FORCE_STEAM_ID',
        });
        expect(player.etf2lProfileId).toEqual(112758);
      });
    });
  });

  describe('#updatePlayer()', () => {
    let admin: PlayerDocument;

    beforeEach(async () => {
      admin = await playerModel.create({
        name: 'FAKE_ADMIN_NAME',
        steamId: 'FAKE_ADMIN_STEAM_ID',
        etf2lProfileId: 1,
        hasAcceptedRules: true,
      });
    });

    it('should update player name', async () => {
      const ret = await service.updatePlayer(
        mockPlayer.id,
        { name: 'NEW_NAME' },
        admin.id,
      );
      expect(ret.name).toEqual('NEW_NAME');
    });

    it('should update player roles', async () => {
      const ret1 = await service.updatePlayer(
        mockPlayer.id,
        { roles: [PlayerRole.admin] },
        admin.id,
      );
      expect(ret1.roles).toEqual([PlayerRole.admin]);

      const ret2 = await service.updatePlayer(
        mockPlayer.id,
        { roles: [] },
        admin.id,
      );
      expect(ret2.roles).toEqual([]);
    });

    it('should emit updated player over websocket', async () => {
      await service.updatePlayer(mockPlayer.id, { name: 'NEW_NAME' }, admin.id);
      expect(socket.emit).toHaveBeenCalledWith(WebsocketEvent.profileUpdate, {
        player: expect.objectContaining({ name: 'NEW_NAME' }),
      });
    });

    describe("when a change doesn't affect JSON output", () => {
      it('should not emit updated player over websocket', async () => {
        await service.updatePlayer(mockPlayer.id, {
          activeGame: new ObjectId(),
        });
        expect(socket.emit).not.toHaveBeenCalled();
      });
    });

    describe('when the given player does not exist', () => {
      it('should reject', async () => {
        await expect(
          service.updatePlayer(new ObjectId().toString(), {}, admin.id),
        ).rejects.toThrowError();
      });
    });
  });

  describe('#acceptTerms', () => {
    it('should accept the terms', async () => {
      const ret = await service.acceptTerms(mockPlayer.id);
      expect(ret.hasAcceptedRules).toBe(true);
    });

    it("should fail if the given user doesn't exist", async () => {
      await expect(
        service.acceptTerms(new ObjectId().toString()),
      ).rejects.toThrow(Error.DocumentNotFoundError);
    });
  });

  describe('#getPlayerStats()', () => {
    it('should return the stats', async () => {
      const ret = await service.getPlayerStats('FAKE_ID');
      expect(ret).toEqual({
        player: 'FAKE_ID',
        gamesPlayed: 220,
        classesPlayed: new Map([
          [Tf2ClassName.scout, 19],
          [Tf2ClassName.soldier, 102],
          [Tf2ClassName.demoman, 0],
          [Tf2ClassName.medic, 92],
        ]),
      });
    });
  });
});
