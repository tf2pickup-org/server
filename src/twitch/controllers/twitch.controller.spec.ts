import { Test, TestingModule } from '@nestjs/testing';
import { TwitchController } from './twitch.controller';
import { TwitchService } from '../services/twitch.service';
import { TwitchAuthService } from '../services/twitch-auth.service';
import { PlayersService } from '@/players/services/players.service';
import { AuthService } from '@/auth/services/auth.service';
import { JsonWebTokenError } from 'jsonwebtoken';
import { BadRequestException } from '@nestjs/common';

class TwitchServiceStub {
  fetchUserProfile(token: string) { return Promise.resolve({ id: 'FAKE_TWITCH_TV_USER_ID' }); }
}

class TwitchAuthServiceStub {
  getOauthRedirectUrl(state: string) { return `FAKE_REDIRECT_URL?state=${state}`; }
  fetchToken(code: string) { return Promise.resolve('FAKE_TOKEN'); }
}

class PlayersServiceStub {
  registerTwitchAccount(playerId: string, twitchUserId: string) { return Promise.resolve(); }
}

class AuthServiceStub {
  verifyToken(purpose, token) { return { id: 'FAKE_USER_ID' }; }
  generateJwtToken(purpose, userId) { return Promise.resolve('FAKE_JWT'); };
}

describe('Twitch Controller', () => {
  let controller: TwitchController;
  let authService: AuthServiceStub;
  let playersService: PlayersServiceStub;

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
        jest.spyOn(authService, 'verifyToken').mockImplementation(() => { throw new JsonWebTokenError('FAKE_ERROR'); });
      });

      it('should return 400', async () => {
        await expect(controller.authenticate('FAKE_TOKEN')).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe('#authenticationCallback()', () => {
    it('should link the twitch.tv account', async () => {
      const spy = jest.spyOn(playersService, 'registerTwitchAccount');
      await controller.authenticationCallback('FAKE_CODE', 'FAKE_STATE');
      expect(spy).toHaveBeenCalledWith('FAKE_USER_ID', 'FAKE_TWITCH_TV_USER_ID');
    });
  });
});
