import { Test, TestingModule } from '@nestjs/testing';
import { TwitchService } from './twitch.service';
import { PlayersService } from '@/players/services/players.service';
import { HttpService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Environment } from '@/environment/environment';
import { of } from 'rxjs';
import { TwitchGateway } from '../gateways/twitch.gateway';
import { TwitchAuthService } from './twitch-auth.service';
import { PlayerBansService } from '@/players/services/player-bans.service';

class PlayersServiceStub {
  twitchUser = {
    id: 'FAKE_USER_ID',
    twitchTvUser: {
      userId: 'FAKE_TWITCH_TV_USER_ID',
      login: 'FAKE_TWITCH_TV_LOGIN',
    },
  };

  getUsersWithTwitchTvAccount() { return Promise.resolve([ this.twitchUser ]); }
  findByTwitchUserId(twitchUserId: string) { return Promise.resolve(this.twitchUser); }
}

class HttpServiceStub {
  get(url: string, options: any) { return of(); }
}

class ConfigServiceStub {
  get(key: string) { return 'FAKE_URL'; }
}

const environment = {
  apiUrl: 'FAKE_API_URL',
  twitchClientId: 'FAKE_TWITCH_CLIENT_ID',
};

class TwitchGatewayStub {

}

class TwitchAuthServiceStub {
  getAppAccessToken() { return Promise.resolve('FAKE_APP_ACCESS_TOKEN'); }
}

class PlayerBansServiceStub {
  getPlayerActiveBans(playerId: string) { return Promise.resolve([]); }
}

describe('TwitchService', () => {
  let service: TwitchService;
  let httpService: HttpServiceStub;
  let playerBansService: PlayerBansService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwitchService,
        { provide: PlayersService, useClass: PlayersServiceStub },
        { provide: HttpService, useClass: HttpServiceStub },
        { provide: ConfigService, useClass: ConfigServiceStub },
        { provide: Environment, useValue: environment },
        { provide: TwitchGateway, useClass: TwitchGatewayStub },
        { provide: TwitchAuthService, useClass: TwitchAuthServiceStub },
        { provide: HttpService, useClass: HttpServiceStub },
        { provide: PlayerBansService, useClass: PlayerBansServiceStub },
      ],
    }).compile();

    service = module.get<TwitchService>(TwitchService);
    httpService = module.get(HttpService);
    playerBansService = module.get(PlayerBansService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#fetchUserProfile()', () => {
    let spy;

    beforeEach(() => {
      spy = jest.spyOn(httpService, 'get').mockReturnValue(of({
        data: {
          'data': [{
            'id': '44322889',
            'login': 'dallas',
            'display_name': 'dallas',
            'type': 'staff',
            'broadcaster_type': '',
            'description': 'Just a gamer playing games and chatting. :)',
            'profile_image_url': 'https://static-cdn.jtvnw.net/jtv_user_pictures/dallas-profile_image-1a2c906ee2c35f12-300x300.png',
            'offline_image_url': 'https://static-cdn.jtvnw.net/jtv_user_pictures/dallas-channel_offline_image-1a2c906ee2c35f12-1920x1080.png',
            'view_count': 191836881,
            'email': 'login@provider.com'
          }]
        }
      }));
    });

    it('should query the correct endpoint', async () => {
      await service.fetchUserProfile('FAKE_ACCESS_TOKEN');
      expect(spy).toHaveBeenCalledWith('FAKE_URL/users', {
        headers: {
          'Authorization': 'Bearer FAKE_ACCESS_TOKEN',
          'Client-ID': 'FAKE_TWITCH_CLIENT_ID',
        },
      });
    });
  });

  describe('#pollUsersStreams()', () => {
    beforeEach(() => {
      jest.spyOn(httpService, 'get').mockReturnValue(of({
        data: {
          'data': [
            {
              'id': '26007494656',
              'user_id': '23161357',
              'user_name': 'LIRIK',
              'game_id': '417752',
              'type': 'live',
              'title': 'Hey Guys, It\'s Monday - Twitter: @Lirik',
              'viewer_count': 32575,
              'started_at': '2017-08-14T16:08:32Z',
              'language': 'en',
              'thumbnail_url': 'https://static-cdn.jtvnw.net/previews-ttv/live_user_lirik-{width}x{height}.jpg',
              'tag_ids': [
                '6ea6bca4-4712-4ab9-a906-e3336a9d8039'
              ],
            },
          ],
          'pagination': {
            'cursor': 'eyJiIjpudWxsLCJhIjp7Ik9mZnNldCI6MjB9fQ=='
          },
        },
      }));
    });

    it('should refresh all streams', async () => {
      await service.pollUsersStreams();
      expect(service.streams.length).toEqual(1);
    });

    describe('when a user is banned', () => {
      beforeEach(() => {
        jest.spyOn(playerBansService, 'getPlayerActiveBans').mockResolvedValue([{ } as any]);
      });

      it('should not add his stream to the list of streams', async () => {
        await service.pollUsersStreams();
        expect(service.streams.length).toEqual(0);
      });
    });
  });
});
