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
    },
  };
  post(url: string) { return of(this.result); }
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

  it('should provide the oauthRedirectUrl', () => {
    expect(service.oauthRedirectUrl).toEqual('https://id.twitch.tv/oauth2/authorize?client_id=FAKE_TWITCH_CLIENT_ID&redirect_uri=FAKE_API_URL/twitch/auth/return&response_type=code&scope=user_read');
  });

  describe('#fetchToken()', () => {
    it('should call the correct url', async () => {
      const spy = jest.spyOn(httpService, 'post');
      await service.fetchToken('FAKE_CODE');
      expect(spy).toHaveBeenCalledWith('https://id.twitch.tv/oauth2/token?client_id=FAKE_TWITCH_CLIENT_ID&client_secret=FAKE_TWITCH_SECRET&code=FAKE_CODE&grant_type=authorization_code&redirect_uri=FAKE_API_URL/twitch/auth/return');
    });

    it('should return the access token', async () => {
      expect(await service.fetchToken('FAKE_CODE')).toEqual('FAKE_ACCESS_TOKEN');
    });
  });
});
