import { Test, TestingModule } from '@nestjs/testing';
import { TwitchController } from './twitch.controller';
import { TwitchService } from '../services/twitch.service';
import { TwitchAuthService } from '../services/twitch-auth.service';
import { PlayersService } from '@/players/services/players.service';
import { AuthService } from '@/auth/services/auth.service';
import { JsonWebTokenError } from 'jsonwebtoken';
import { BadRequestException } from '@nestjs/common';
import { Player } from '@/players/models/player';

class TwitchServiceStub {
  streams = [
    {
      playerId: '5d448875b963ff7e00c6b6b3',
      id: '1495594625',
      userName: 'H2P_Gucio',
      title: 'Bliżej niż dalej :)  / 10 zgonów = gift sub',
      thumbnailUrl:
        'https://static-cdn.jtvnw.net/previews-ttv/live_user_h2p_gucio-{width}x{height}.jpg',
      viewerCount: 5018,
    },
    {
      playerId: '5d44887bb963ff7e00c6b6bb',
      id: '1494755665',
      userName: 'xEmtek',
      title: 'SPEEDRUN do 1 rangi - ciąg dalszy ',
      thumbnailUrl:
        'https://static-cdn.jtvnw.net/previews-ttv/live_user_xemtek-{width}x{height}.jpg',
      viewerCount: 703,
    },
  ];
  fetchUserProfile(token: string) {
    return Promise.resolve({
      id: 'FAKE_TWITCH_TV_USER_ID',
      login: 'FAKE_TWITCH_TV_LOGIN',
      display_name: 'FAKE_TWITCH_TV_DISPLAY_NAME',
      profile_image_url: 'FAKE_TWITCH_TV_PROFILE_IMAGE_URL',
    });
  }
}

class TwitchAuthServiceStub {
  getOauthRedirectUrl(state: string) {
    return `FAKE_REDIRECT_URL?state=${state}`;
  }
  fetchUserAccessToken(code: string) {
    return Promise.resolve('FAKE_TOKEN');
  }
}

class PlayersServiceStub {
  registerTwitchAccount(playerId: string, twitchUserId: string) {
    return Promise.resolve();
  }
  removeTwitchTvProfile = jest.fn().mockResolvedValue({ id: 'FAKE_USER_ID' });
}

class AuthServiceStub {
  verifyToken(purpose, token) {
    return { id: 'FAKE_USER_ID' };
  }
  generateJwtToken(purpose, userId) {
    return Promise.resolve('FAKE_JWT');
  }
}

describe('Twitch Controller', () => {
  let controller: TwitchController;
  let authService: AuthServiceStub;
  let playersService: PlayersServiceStub;
  let twitchService: TwitchServiceStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TwitchController],
      providers: [
        { provide: TwitchService, useClass: TwitchServiceStub },
        { provide: TwitchAuthService, useClass: TwitchAuthServiceStub },
        { provide: PlayersService, useClass: PlayersServiceStub },
        { provide: AuthService, useClass: AuthServiceStub },
      ],
    }).compile();

    controller = module.get<TwitchController>(TwitchController);
    authService = module.get(AuthService);
    playersService = module.get(PlayersService);
    twitchService = module.get(TwitchService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('#authenticate()', () => {
    it('should return redirect url', async () => {
      const ret = await controller.authenticate('FAKE_TOKEN');
      expect(ret).toEqual({
        url: 'FAKE_REDIRECT_URL?state=FAKE_JWT',
      });
    });

    describe('if the jwt is incorrect', () => {
      beforeEach(() => {
        jest.spyOn(authService, 'verifyToken').mockImplementation(() => {
          throw new JsonWebTokenError('FAKE_ERROR');
        });
      });

      it('should return 400', async () => {
        await expect(controller.authenticate('FAKE_TOKEN')).rejects.toThrow(
          BadRequestException,
        );
      });
    });
  });

  describe('#authenticationCallback()', () => {
    it('should link the twitch.tv account', async () => {
      const spy = jest.spyOn(playersService, 'registerTwitchAccount');
      await controller.authenticationCallback('FAKE_CODE', 'FAKE_STATE');
      expect(spy).toHaveBeenCalledWith('FAKE_USER_ID', {
        userId: 'FAKE_TWITCH_TV_USER_ID',
        login: 'FAKE_TWITCH_TV_LOGIN',
        displayName: 'FAKE_TWITCH_TV_DISPLAY_NAME',
        profileImageUrl: 'FAKE_TWITCH_TV_PROFILE_IMAGE_URL',
      });
    });
  });

  describe('#disconnect()', () => {
    it("should remove twitch.tv profile from the user's account", async () => {
      const ret = await controller.disconnect({ id: 'FAKE_USER_ID' } as Player);
      expect(playersService.removeTwitchTvProfile).toHaveBeenCalledWith(
        'FAKE_USER_ID',
      );
      expect(ret).toEqual({ id: 'FAKE_USER_ID' });
    });
  });

  describe('#getStreams()', () => {
    it('should return streams', () => {
      expect(controller.getStreams()).toEqual(twitchService.streams);
    });
  });
});
