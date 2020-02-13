import { Test, TestingModule } from '@nestjs/testing';
import { PlayersService } from './players.service';
import { Environment } from '@/environment/environment';
import { Etf2lProfileService } from './etf2l-profile.service';
import { getModelToken } from 'nestjs-typegoose';
import { SteamProfile } from '../models/steam-profile';
import { GamesService } from '@/games/services/games.service';
import { OnlinePlayersService } from './online-players.service';
import { DiscordNotificationsService } from '@/discord/services/discord-notifications.service';
import { ConfigService } from '@nestjs/config';
import { Etf2lProfile } from '../models/etf2l-profile';

class EnvironmentStub {
  superUser = null;
}

class Etf2lProfileServiceStub {
  fetchPlayerInfo(steamId: string): any {
    return {
      id: 12345,
      name: 'FAKE_ETF2L_NAME',
      country: 'SOME_COUNTRY',
      classes: [],
    };
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

const playerModel = {
  findById: (id: string) => null,
  findOne: (obj: any) => null,
  create: (object: any) => null,
};

class OnlinePlayersServiceStub {
  getSocketsForPlayer(playerId: string) { return []; }
}

class DiscordNotificationsServiceStub {
  notifyNewPlayer(player: any) { return null; }
}

class ConfigServiceStub {
  get(key: string) { return true; }
}

describe('PlayersService', () => {
  let service: PlayersService;
  let environment: EnvironmentStub;
  let etf2lProfileService: Etf2lProfileServiceStub;
  let gamesService: GamesServiceStub;
  let onlinePlayersService: OnlinePlayersServiceStub;
  let discordNotificationsService: DiscordNotificationsServiceStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayersService,
        { provide: Environment, useClass: EnvironmentStub },
        { provide: Etf2lProfileService, useClass: Etf2lProfileServiceStub },
        { provide: getModelToken('Player'), useValue: playerModel },
        { provide: GamesService, useClass: GamesServiceStub },
        { provide: OnlinePlayersService, useClass: OnlinePlayersServiceStub },
        { provide: DiscordNotificationsService, useClass: DiscordNotificationsServiceStub },
        { provide: ConfigService, useClass: ConfigServiceStub },
      ],
    }).compile();

    service = module.get<PlayersService>(PlayersService);
    environment = module.get(Environment);
    etf2lProfileService = module.get(Etf2lProfileService);
    gamesService = module.get(GamesService);
    onlinePlayersService = module.get(OnlinePlayersService);
    discordNotificationsService = module.get(DiscordNotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#getById()', () => {
    it('should query playerModel', () => {
      const spy = spyOn(playerModel, 'findById');
      service.getById('FAKE_ID');
      expect(spy).toHaveBeenCalledWith('FAKE_ID');
    });
  });

  describe('#findBySteamId()', () => {
    it('should query playerModel', () => {
      const spy = spyOn(playerModel, 'findOne');
      service.findBySteamId('FAKE_STEAM_ID');
      expect(spy).toHaveBeenCalledWith({ steamId: 'FAKE_STEAM_ID' });
    });
  });

  describe('#createPlayer()', () => {
    const steamProfile: SteamProfile = {
      provider: 'steam',
      id: 'FAKE_STEAM_ID',
      displayName: 'FAKE_DISPLAY_NAME',
      photos: [{ value: 'FAKE_AVATAR_URL' }],
    };

    it('should deny creating profiles without ETF2L profile', async () => {
      const spy = spyOn(etf2lProfileService, 'fetchPlayerInfo').and.throwError('no ETF2L profile');
      await expectAsync(service.createPlayer(steamProfile)).toBeRejected();
      expect(spy).toHaveBeenCalledWith('FAKE_STEAM_ID');
    });

    it('should deny creating profiles for players with ETF2L bans', async () => {
      // http://api.etf2l.org/player/129205
      const blacklistedProfile: Partial<Etf2lProfile> = {
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

      const banEnd = new Date();
      banEnd.setHours(banEnd.getHours() + 1);
      const spy = spyOn(etf2lProfileService, 'fetchPlayerInfo').and.returnValue(blacklistedProfile);
      await expectAsync(service.createPlayer(steamProfile)).toBeRejectedWithError('this account is banned on ETF2L');
      expect(spy).toHaveBeenCalledWith('FAKE_STEAM_ID');
    });

    it('should eventually create new player', async () => {
      const banEnd = new Date();
      banEnd.setHours(banEnd.getHours() - 1);
      spyOn(etf2lProfileService, 'fetchPlayerInfo').and
        .returnValue({ id: 12345, name: 'FAKE_ETF2L_NAME', bans: [ { end: banEnd.getTime() / 1000 } ] });

      const player = { id: 'FAKE_STEAM_ID', name: 'FAKE_NAME' };
      const spy = spyOn(playerModel, 'create').and.returnValue(player);

      const ret = await service.createPlayer(steamProfile);

      expect(spy).toHaveBeenCalledWith({
        steamId: 'FAKE_STEAM_ID',
        name: 'FAKE_ETF2L_NAME',
        avatarUrl: 'FAKE_AVATAR_URL',
        role: null,
        etf2lProfileId: 12345,
      });
      expect(ret as any).toEqual(player);
    });

    it('should assign the super-user role', async () => {
      environment.superUser = 'FAKE_STEAM_ID';
      const spy = spyOn(playerModel, 'create');
      await service.createPlayer(steamProfile);

      expect(spy).toHaveBeenCalledWith({
        steamId: 'FAKE_STEAM_ID',
        name: 'FAKE_ETF2L_NAME',
        avatarUrl: 'FAKE_AVATAR_URL',
        role: 'super-user',
        etf2lProfileId: 12345,
      });
    });

    it('should notify on discord', async () => {
      const spy = spyOn(discordNotificationsService, 'notifyNewPlayer');
      await service.createPlayer(steamProfile);
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('#updatePlayer()', () => {
    const player = {
      name: 'OLD_NAME',
      role: null,
      save: () => null,
    };

    it('should update and save', async () => {
      const spy = spyOn(service, 'getById').and.returnValue(new Promise(resolve => resolve(player as any)));
      const spy2 = spyOn(player, 'save');

      await service.updatePlayer('FAKE_ID', { name: 'NEW_NAME', role: 'admin' });
      expect(spy).toHaveBeenCalledWith('FAKE_ID');
      expect(player.name).toEqual('NEW_NAME');
      expect(player.role).toEqual('admin');
      expect(spy2).toHaveBeenCalled();
    });

    it('should emit updated player over websocket', async () => {
      spyOn(service, 'getById').and.returnValue(new Promise(resolve => resolve(player as any)));

      const socket = { emit: (...args: any[]) => null };
      const spy = spyOn(onlinePlayersService, 'getSocketsForPlayer').and.returnValue([ socket ] as any);
      const spy2 = spyOn(socket, 'emit').and.callThrough();

      await service.updatePlayer('FAKE_ID', { name: 'NEW_NAME' });
      expect(spy).toHaveBeenCalledWith('FAKE_ID');
      expect(spy2).toHaveBeenCalledWith('profile update', { name: 'NEW_NAME' });
    });

    it('should return null if the given player does not exist', async () => {
      spyOn(service, 'getById').and.returnValue(new Promise(resolve => resolve(null)));
      expect(await service.updatePlayer('FAKE_ID', { })).toBeNull();
    });
  });

  describe('#acceptTerms', () => {
    it('should accept the terms', async () => {
      const player = {
        hasAcceptedRules: false,
        save: () => null,
      };
      const spy = spyOn(service, 'getById').and.returnValue(new Promise(resolve => resolve(player as any)));
      const spy2 = spyOn(player, 'save');

      await service.acceptTerms('FAKE_ID');
      expect(spy).toHaveBeenCalledWith('FAKE_ID');
      expect(player.hasAcceptedRules).toBe(true);
      expect(spy2).toHaveBeenCalled();
    });

    it('should fail if the given user doesn\'t exist', async () => {
      spyOn(service, 'getById').and.returnValue(new Promise(resolve => resolve(null)));
      await expectAsync(service.acceptTerms('FAKE_ID')).toBeRejectedWithError('no such player');
    });
  });

  describe('#getPlayerStats()', () => {
    it('should return the stats', async () => {
      const spy1 = spyOn(gamesService, 'getPlayerGameCount').and.callThrough();
      const spy2 = spyOn(gamesService, 'getPlayerPlayedClassCount').and.callThrough();
      const ret = await service.getPlayerStats('FAKE_ID');
      expect(spy1).toHaveBeenCalledWith('FAKE_ID', { endedOnly: true });
      expect(spy2).toHaveBeenCalledWith('FAKE_ID');
      expect(ret).toEqual({
        player: 'FAKE_ID',
        gamesPlayed: 220,
        classesPlayed: gamesService.classCount,
      });
    });
  });
});
