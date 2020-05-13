import { Test, TestingModule } from '@nestjs/testing';
import { PlayersService } from './players.service';
import { Environment } from '@/environment/environment';
import { Etf2lProfileService } from './etf2l-profile.service';
import { getModelToken, TypegooseModule } from 'nestjs-typegoose';
import { SteamProfile } from '../models/steam-profile';
import { GamesService } from '@/games/services/games.service';
import { OnlinePlayersService } from './online-players.service';
import { DiscordNotificationsService } from '@/discord/services/discord-notifications.service';
import { ConfigService } from '@nestjs/config';
import { Etf2lProfile } from '../models/etf2l-profile';
import { ReturnModelType, DocumentType } from '@typegoose/typegoose';
import { Player } from '../models/player';
import { typegooseTestingModule } from '@/utils/testing-typegoose-module';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { SteamApiService } from './steam-api.service';

class EnvironmentStub {
  superUser = null;
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

class DiscordNotificationsServiceStub {
  notifyNewPlayer(player: any) { return Promise.resolve(); }
  notifyNameChange(player: any, oldName: string) { return Promise.resolve(); }
}

class ConfigServiceStub {
  get(key: string) {
    switch (key) {
      case 'minimumTf2InGameHours':
        return 500;
      case 'requireEtf2lAccount':
        return true;
    }
  }
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
  let discordNotificationsService: DiscordNotificationsServiceStub;
  let steamApiService: SteamApiServiceStub;

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
        { provide: DiscordNotificationsService, useClass: DiscordNotificationsServiceStub },
        { provide: ConfigService, useClass: ConfigServiceStub },
        { provide: SteamApiService, useClass: SteamApiServiceStub },
      ],
    }).compile();

    service = module.get<PlayersService>(PlayersService);
    playerModel = module.get(getModelToken('Player'));
    environment = module.get(Environment);
    etf2lProfileService = module.get(Etf2lProfileService);
    gamesService = module.get(GamesService);
    onlinePlayersService = module.get(OnlinePlayersService);
    discordNotificationsService = module.get(DiscordNotificationsService);
    steamApiService = module.get(SteamApiService);
  });

  beforeEach(async () => {
    mockPlayer = await playerModel.create({
      name: 'FAKE_PLAYER_NAME',
      steamId: 'FAKE_STEAM_ID',
      etf2lProfileId: 123456,
    });
  });

  afterEach(async () => await playerModel.deleteMany({ }));

  it('should be defined', () => {
    expect(service).toBeDefined();
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
      const spy = jest.spyOn(discordNotificationsService, 'notifyNewPlayer');
      const player = await service.createPlayer(mockSteamProfile);
      expect(spy).toHaveBeenCalledWith(player);
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
    });
  });

  describe('#updatePlayer()', () => {
    it('should update player name', async () => {
      const ret = await service.updatePlayer(mockPlayer.id, { name: 'NEW_NAME' });
      expect(ret.name).toEqual('NEW_NAME');
    });

    it('should update player role', async () => {
      const ret1 = await service.updatePlayer(mockPlayer.id, { role: 'admin' });
      expect(ret1.role).toEqual('admin');

      const ret2 = await service.updatePlayer(mockPlayer.id, { role: null });
      expect(ret2.role).toBe(null);
    });

    it('should emit updated player over websocket', async () => {
      const socket = { emit: (...args: any[]) => null };
      jest.spyOn(onlinePlayersService, 'getSocketsForPlayer').mockReturnValue([ socket ] as any);
      const spy = jest.spyOn(socket, 'emit');

      await service.updatePlayer(mockPlayer.id, { name: 'NEW_NAME' });
      expect(spy).toHaveBeenCalledWith('profile update', { name: 'NEW_NAME' });
    });

    it('should return null if the given player does not exist', async () => {
      jest.spyOn(service, 'getById').mockResolvedValue(null);
      expect(await service.updatePlayer('FAKE_ID', { })).toBeNull();
    });

    it('should notify admins on Discord', async () => {
      const spy = jest.spyOn(discordNotificationsService, 'notifyNameChange');
      await service.updatePlayer(mockPlayer.id, { name: 'NEW_NAME' });
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ name: 'NEW_NAME' }), 'FAKE_PLAYER_NAME');
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
