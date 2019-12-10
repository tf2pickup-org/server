import { Test, TestingModule } from '@nestjs/testing';
import { PlayersService } from './players.service';
import { ConfigService } from '@/config/config.service';
import { Etf2lProfileService } from './etf2l-profile.service';
import { getModelToken } from 'nestjs-typegoose';
import { SteamProfile } from './models/steam-profile';

class ConfigServiceStub {
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

const playerModel = {
  findById: (id: string) => null,
  findOne: (obj: any) => null,
  create: (object: any) => null,
};

describe('PlayersService', () => {
  let service: PlayersService;
  let configService: ConfigServiceStub;
  let etf2lProfileService: Etf2lProfileServiceStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayersService,
        { provide: ConfigService, useClass: ConfigServiceStub },
        { provide: Etf2lProfileService, useClass: Etf2lProfileServiceStub },
        { provide: getModelToken('Player'), useValue: playerModel },
      ],
    }).compile();

    service = module.get<PlayersService>(PlayersService);
    configService = module.get(ConfigService);
    etf2lProfileService = module.get(Etf2lProfileService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#findById()', () => {
    it('should query playerModel', () => {
      const spy = spyOn(playerModel, 'findById');
      service.findById('FAKE_ID');
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
      const banEnd = new Date();
      banEnd.setHours(banEnd.getHours() + 1);
      const spy = spyOn(etf2lProfileService, 'fetchPlayerInfo').and.returnValue({ bans: [ { end: banEnd.getTime(), reason: '', start: 0 } ] });
      await expectAsync(service.createPlayer(steamProfile)).toBeRejectedWithError('this account is banned on ETF2L');
      expect(spy).toHaveBeenCalledWith('FAKE_STEAM_ID');
    });

    it('should eventually create new player', async () => {
      const banEnd = new Date();
      banEnd.setHours(banEnd.getHours() - 1);
      spyOn(etf2lProfileService, 'fetchPlayerInfo').and.returnValue({ id: 12345, name: 'FAKE_ETF2L_NAME', bans: [ { end: banEnd.getTime() } ] });

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
      configService.superUser = 'FAKE_STEAM_ID';
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
  });

  describe('#acceptTerms', () => {
    it('should accept the terms', async () => {
      const player = {
        hasAcceptedRules: false,
        save: () => null,
      };
      const spy = spyOn(service, 'findById').and.returnValue(new Promise(resolve => resolve(player as any)));
      const spy2 = spyOn(player, 'save');

      await service.acceptTerms('FAKE_ID');
      expect(spy).toHaveBeenCalledWith('FAKE_ID');
      expect(player.hasAcceptedRules).toBe(true);
      expect(spy2).toHaveBeenCalled();
    });

    it('should fail if the given user doesn\'t exist', async () => {
      spyOn(service, 'findById').and.returnValue(new Promise(resolve => resolve(null)));
      await expectAsync(service.acceptTerms('FAKE_ID')).toBeRejectedWithError('no such player');
    });
  });
});
