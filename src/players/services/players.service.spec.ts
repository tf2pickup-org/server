import { Test, TestingModule } from '@nestjs/testing';
import { PlayersService } from './players.service';
import { Environment } from '@/environment/environment';
import { Etf2lProfileService } from './etf2l-profile.service';
import { getModelToken, TypegooseModule } from 'nestjs-typegoose';
import { SteamProfile } from '../models/steam-profile';
import { GamesService } from '@/games/services/games.service';
import { OnlinePlayersService } from './online-players.service';
import { Etf2lProfile } from '../models/etf2l-profile';
import { ReturnModelType, DocumentType } from '@typegoose/typegoose';
import { Player } from '../models/player';
import { typegooseTestingModule } from '@/utils/testing-typegoose-module';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { SteamApiService } from './steam-api.service';
import { DiscordService } from '@/discord/services/discord.service';
import { ObjectId } from 'mongodb';

jest.mock('@configs/players', () => ({
  minimumTf2InGameHours: 500,
  requireEtf2lAccount: true,
}));
import { minimumTf2InGameHours } from '@configs/players';

jest.mock('@/discord/services/discord.service');

class EnvironmentStub {
  superUser = null;
  botName = 'FAKE_BOT_NAME';
}

class Etf2lProfileServiceStub {
  fetchPlayerInfo(steamId: string): Promise<Etf2lProfile> {
    return Promise.resolve({
      // http://api.etf2l.org/player/112758
      bans: null,
      classes: [
        'Soldier',
        'Medic',
      ],
      country: 'Poland',
      id: 112758,
      name: 'maly',
    });
  }
}

class GamesServiceStub {
  classCount = {
    scout: 19,
    soldier: 102,
    demoman: 0,
    medic: 92,
  };

  getPlayerGameCount(playerId: string, options: any) { return 220; }
  getPlayerPlayedClassCount(playerId: string) { return this.classCount; }
}

class OnlinePlayersServiceStub {
  getSocketsForPlayer(playerId: string) { return []; }
}

class SteamApiServiceStub {
  getTf2InGameHours(steamId64: string) { return Promise.resolve(800); }
}

describe('PlayersService', () => {
  let service: PlayersService;
  let mongod: MongoMemoryServer;
  let playerModel: ReturnModelType<typeof Player>;
  let mockPlayer: DocumentType<Player>;
  let environment: EnvironmentStub;
  let etf2lProfileService: Etf2lProfileServiceStub;
  let gamesService: GamesServiceStub;
  let onlinePlayersService: OnlinePlayersServiceStub;
  let steamApiService: SteamApiServiceStub;
  let discordService: DiscordService;

  beforeAll(() => mongod = new MongoMemoryServer());
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        typegooseTestingModule(mongod),
        TypegooseModule.forFeature([Player]),
      ],
      providers: [
        PlayersService,
        { provide: Environment, useClass: EnvironmentStub },
        { provide: Etf2lProfileService, useClass: Etf2lProfileServiceStub },
        { provide: GamesService, useClass: GamesServiceStub },
        { provide: OnlinePlayersService, useClass: OnlinePlayersServiceStub },
        { provide: SteamApiService, useClass: SteamApiServiceStub },
        DiscordService,
      ],
    }).compile();

    service = module.get<PlayersService>(PlayersService);
    playerModel = module.get(getModelToken('Player'));
    environment = module.get(Environment);
    etf2lProfileService = module.get(Etf2lProfileService);
    gamesService = module.get(GamesService);
    onlinePlayersService = module.get(OnlinePlayersService);
    steamApiService = module.get(SteamApiService);
    discordService = module.get(DiscordService);
  });

  beforeEach(async () => {
    mockPlayer = await playerModel.create({
      name: 'FAKE_PLAYER_NAME',
      steamId: 'FAKE_STEAM_ID',
      etf2lProfileId: 123456,
      hasAcceptedRules: true,
    });
  });

  afterEach(async () => await playerModel.deleteMany({ }));

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#onModuleInit()', () => {
    describe('when the bot user is not yet created', () => {
      it('should create the bot user', async () => {
        await service.onModuleInit();
        expect(await playerModel.findOne({ name: 'FAKE_BOT_NAME' })).toBeTruthy();
      });
    });

    describe('when the bot user is already created', () => {
      beforeEach(async () => {
        await service.onModuleInit();
      });

      it('should not create any users', async () => {
        await service.onModuleInit();
        expect((await playerModel.find({ name: 'FAKE_BOT_NAME' })).length).toEqual(1);
      });
    });
  });

  describe('#getAll()', () => {
    it('should retrieve all players from the database', async () => {
      const ret = await service.getAll();
      expect(ret.length).toEqual(1);
      expect(ret[0].toObject()).toEqual(mockPlayer.toObject());
    });
  });

  describe('#getById()', () => {
    it('should retrieve the player from the database', async () => {
      const player = await service.getById(mockPlayer.id);
      expect(player.toObject()).toEqual(mockPlayer.toObject());
    });
  });

  describe('#findBySteamId()', () => {
    it('should query playerModel', async () => {
      const player = await service.findBySteamId('FAKE_STEAM_ID');
      expect(player.toObject()).toEqual(mockPlayer.toObject());
    });
  });

  describe('#findByEtf2lProfileId()', () => {
    it('should query playerModel', async () => {
      const player = await service.findByEtf2lProfileId(123456);
      expect(player.toObject()).toEqual(mockPlayer.toObject());
    });
  });

  describe('#findByTwitchUserId()', () => {
    beforeEach(async () => {
      const player = await playerModel.findOne();
      player.twitchTvUser = {
        userId: 'FAKE_TWITCH_TV_USER_ID',
        login: 'FAKE_TWITCH_TV_LOGIN',
      };
      await player.save();
    });

    it('should query playerModel', async () => {
      const player = await service.findByTwitchUserId('FAKE_TWITCH_TV_USER_ID');
      expect(player.toObject()).toEqual(expect.objectContaining({
        twitchTvUser: expect.objectContaining({
          userId: 'FAKE_TWITCH_TV_USER_ID',
        }),
      }));
    });
  });

  describe('#findBot()', () => {
    beforeEach(async () => {
      await playerModel.create({
        name: 'FAKE_BOT_NAME',
        role: 'bot',
      })
    });

    it('should find the bot', async () => {
      expect(await service.findBot()).toMatchObject({
        name: 'FAKE_BOT_NAME',
        role: 'bot',
      });
    });
  });

  describe('#createPlayer()', () => {
    const mockSteamProfile: SteamProfile = {
      provider: 'steam',
      id: 'FAKE_STEAM_ID_2',
      displayName: 'FAKE_DISPLAY_NAME',
      photos: [{ value: 'FAKE_AVATAR_URL' }],
    };

    describe('when an ETFL2 profile doesn\'t exist', () => {
      beforeEach(() => {
        jest.spyOn(etf2lProfileService, 'fetchPlayerInfo').mockRejectedValue(new Error('no etf2l profile'));
      });

      it('should deny creating tf2pickup.pl profile', async () => {
        await expect(service.createPlayer(mockSteamProfile)).rejects.toThrowError('no etf2l profile');
      });
    });

    describe('when the user has ETFL2 ban', () => {
      // http://api.etf2l.org/player/129205
      const blacklistedProfile: Etf2lProfile = {
        bans: [
          {
            end: 4294967295,
            reason: 'Blacklisted',
            start: 0,
          },
        ],
        classes: [
          'Scout',
          'Soldier',
          'Sniper',
        ],
        country: 'Russia',
        id: 129205,
        name: 'Tixx',
      };

      beforeEach(() => {
        jest.spyOn(etf2lProfileService, 'fetchPlayerInfo').mockResolvedValue(blacklistedProfile);
      });

      it('should deny creating tf2pickup.pl profile', async () => {
        await expect(service.createPlayer(mockSteamProfile)).rejects.toThrowError('this account is banned on ETF2L');
      });
    });

    it('should create new player', async () => {
      const ret = await service.createPlayer(mockSteamProfile);
      expect(ret.toObject()).toMatchObject({
        steamId: 'FAKE_STEAM_ID_2',
        name: 'maly',
        avatarUrl: 'FAKE_AVATAR_URL',
        role: null,
        etf2lProfileId: 112758,
      });
    });

    it('should assign the super-user role', async () => {
      environment.superUser = 'FAKE_STEAM_ID_2';
      const ret = await service.createPlayer(mockSteamProfile);
      expect(ret.role).toEqual('super-user');
    });

    it('should emit the rxjs event', done => {
      service.playerRegistered.subscribe(e => {
        expect(e).toBeTruthy();
        done();
      });
      service.createPlayer(mockSteamProfile);
    });

    it('should notify on discord', async () => {
      const spy = jest.spyOn(discordService.getAdminsChannel(), 'send');
      const player = await service.createPlayer(mockSteamProfile);
      expect(spy).toHaveBeenCalled();
    });

    describe('when TF2 in-game hours requirements are not met', () => {
      beforeEach(() => {
        jest.spyOn(steamApiService, 'getTf2InGameHours').mockResolvedValue(400);
      });

      it('should deny', async () => {
        await expect(service.createPlayer(mockSteamProfile)).rejects.toThrowError('not enough tf2 hours');
      });
    });

    describe('when TF2 in-game hours could not be fetched', () => {
      beforeEach(() => {
        jest.spyOn(steamApiService, 'getTf2InGameHours').mockRejectedValue(new Error('cannot verify in-game hours for TF2'));
      });

      it('should deny', async () => {
        await expect(service.createPlayer(mockSteamProfile)).rejects.toThrowError('cannot verify in-game hours for TF2');
      });

      describe('and nobody cares', () => {
        beforeEach(() => {
          // @ts-ignore
          minimumTf2InGameHours = 0;
        });

        afterEach(() => {
          // @ts-ignore
          minimumTf2InGameHours = 500;
        });

        it('should pass', async () => {
          await service.createPlayer(mockSteamProfile);
        });
      });
    });
  });

  describe('#registerTwitchAccount()', () => {
    const twitchTvUser = {
      userId: 'FAKE_TWITCH_TV_USER_ID',
      login: 'FAKE_TWITCH_TV_LOGIN',
    };

    describe('when the given user does not exist', () => {
      beforeEach(() => {
        jest.spyOn(service, 'getById').mockResolvedValue(null);
      });

      it('should throw an error', async () => {
        expect(service.registerTwitchAccount('FAKE_ID', {
          userId: 'FAKE_TWITCH_TV_USER_ID',
          login: 'FAKE_TWITCH_TV_LOGIN',
        })).rejects.toThrowError('no such player');
      });
    });

    it('should save the twitch user id', async () => {
      const ret = await service.registerTwitchAccount(mockPlayer.id, twitchTvUser);
      expect(ret.twitchTvUser).toEqual(expect.objectContaining(twitchTvUser));
    });

    it('should notify all clients via ws', async () => {
      const socket = { emit: (...args: any[]) => null };
      jest.spyOn(onlinePlayersService, 'getSocketsForPlayer').mockReturnValue([ socket ] as any);
      const spy = jest.spyOn(socket, 'emit');

      await service.registerTwitchAccount(mockPlayer.id, twitchTvUser);
      expect(spy).toHaveBeenCalledWith('profile update', { twitchTvUser });
    });
  });

  describe('#getUsersWithTwitchTvAccount()', () => {
    beforeEach(async () => {
      const player = await playerModel.findOne();
      player.twitchTvUser = {
        userId: 'FAKE_TWITCH_TV_USER_ID',
        login: 'FAKE_TWITCH_TV_LOGIN',
      };
      await player.save();
    });

    it('should return all twitch.tv user ids', async () => {
      const ret = await service.getUsersWithTwitchTvAccount();
      expect(ret.length).toBe(1);
      expect(ret[0].twitchTvUser.userId).toEqual('FAKE_TWITCH_TV_USER_ID');
    });
  });

  describe('#updatePlayer()', () => {
    let admin: DocumentType<Player>;

    beforeEach(async () => {
      admin = await playerModel.create({
        name: 'FAKE_ADMIN_NAME',
        steamId: 'FAKE_ADMIN_STEAM_ID',
        etf2lProfileId: 1,
        hasAcceptedRules: true,
      });
    });

    it('should update player name', async () => {
      const ret = await service.updatePlayer(mockPlayer.id, { name: 'NEW_NAME' }, admin.id);
      expect(ret.name).toEqual('NEW_NAME');
    });

    it('should update player role', async () => {
      const ret1 = await service.updatePlayer(mockPlayer.id, { role: 'admin' }, admin.id);
      expect(ret1.role).toEqual('admin');

      const ret2 = await service.updatePlayer(mockPlayer.id, { role: null }, admin.id);
      expect(ret2.role).toBe(null);
    });

    it('should emit updated player over websocket', async () => {
      const socket = { emit: (...args: any[]) => null };
      jest.spyOn(onlinePlayersService, 'getSocketsForPlayer').mockReturnValue([ socket ] as any);
      const spy = jest.spyOn(socket, 'emit');

      await service.updatePlayer(mockPlayer.id, { name: 'NEW_NAME' }, admin.id);
      expect(spy).toHaveBeenCalledWith('profile update', { name: 'NEW_NAME' });
    });

    it('should return null if the given player does not exist', async () => {
      expect(await service.updatePlayer(new ObjectId().toString(), { }, admin.id)).toBeNull();
    });

    it('should notify admins on Discord', async () => {
      const spy = jest.spyOn(discordService.getAdminsChannel(), 'send');
      await service.updatePlayer(mockPlayer.id, { name: 'NEW_NAME' }, admin.id);
      expect(spy).toHaveBeenCalled();
    });

    describe('when the admin does not exist', () => {
      it('should reject', async () => {
        await expect(service.updatePlayer(mockPlayer.id, { name: 'NEW_NAME' }, new ObjectId().toString())).rejects.toThrowError();
      });
    });
  });

  describe('#acceptTerms', () => {
    it('should accept the terms', async () => {
      const ret = await service.acceptTerms(mockPlayer.id);
      expect(ret.hasAcceptedRules).toBe(true);
    });

    it('should fail if the given user doesn\'t exist', async () => {
      jest.spyOn(service, 'getById').mockResolvedValue(null);
      await expect(service.acceptTerms('FAKE_ID')).rejects.toThrowError('no such player');
    });
  });

  describe('#getPlayerStats()', () => {
    it('should return the stats', async () => {
      const ret = await service.getPlayerStats('FAKE_ID');
      expect(ret).toEqual({
        player: 'FAKE_ID',
        gamesPlayed: 220,
        classesPlayed: gamesService.classCount,
      });
    });
  });
});
