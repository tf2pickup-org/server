import { Test, TestingModule } from '@nestjs/testing';
import { TwitchAuthService } from './twitch-auth.service';
import { Environment } from '@/environment/environment';
import { HttpService } from '@nestjs/common';
import { of } from 'rxjs';

const environment = {
  apiUrl: 'FAKE_API_URL',
  twitchClientId: 'FAKE_TWITCH_CLIENT_ID',
  twitchClientSecret: 'FAKE_TWITCH_SECRET',
};

class HttpServiceStub {
  result = {
    data: {
      access_token: 'FAKE_ACCESS_TOKEN',
      expires_in: 3600,
    },
  };
  post(url: string) {
    return of(this.result);
  }
}

describe('TwitchAuthService', () => {
  let service: TwitchAuthService;
  let httpService: HttpServiceStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwitchAuthService,
        { provide: Environment, useValue: environment },
        { provide: HttpService, useClass: HttpServiceStub },
      ],
    }).compile();

    service = module.get<TwitchAuthService>(TwitchAuthService);
    httpService = module.get(HttpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#getOauthRedirectUrl()', () => {
    it('should provide the oauthRedirectUrl', () => {
      expect(service.getOauthRedirectUrl('FAKE_STATE')).toEqual(
        'https://id.twitch.tv/oauth2/authorize?client_id=FAKE_TWITCH_CLIENT_ID&redirect_uri=FAKE_API_URL/twitch/auth/return&response_type=code&scope=user_read&state=FAKE_STATE',
      );
    });
  });

  describe('#fetchUserAccessToken()', () => {
    it('should return the access token', async () => {
      const token = await service.fetchUserAccessToken('FAKE_CODE');
      expect(token).toEqual('FAKE_ACCESS_TOKEN');
    });
  });

  describe('#getAppAccessToken()', () => {
    it('should return the access token', async () => {
      const accessToken = await service.getAppAccessToken();
      expect(accessToken).toEqual('FAKE_ACCESS_TOKEN');
    });

    it('should cache the token', async () => {
      const spy = jest.spyOn(httpService, 'post');
      await service.getAppAccessToken();
      await service.getAppAccessToken();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
