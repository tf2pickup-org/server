import { Test, TestingModule } from '@nestjs/testing';
import { TwitchTvApiService } from './twitch-tv-api.service';
import { HttpService } from '@nestjs/axios';
import { Environment } from '@/environment/environment';
import { TwitchAuthService } from './twitch-auth.service';
import { of } from 'rxjs';
import { AxiosResponse } from 'axios';
import { TwitchTvGetUsersResponse } from '../types/twitch-tv-get-users-response';
import { TwitchTvGetStreamsResponse } from '../types/twitch-tv-get-streams-response';

jest.mock('@nestjs/axios');
jest.mock('./twitch-auth.service');

const environment = {
  apiUrl: 'FAKE_API_URL',
  twitchClientId: 'FAKE_TWITCH_CLIENT_ID',
};

describe('TwitchTvApiService', () => {
  let service: TwitchTvApiService;
  let httpService: jest.Mocked<HttpService>;
  let twitchAuthService: jest.Mocked<TwitchAuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwitchTvApiService,
        HttpService,
        { provide: Environment, useValue: environment },
        TwitchAuthService,
      ],
    }).compile();

    service = module.get<TwitchTvApiService>(TwitchTvApiService);
    httpService = module.get(HttpService);
    twitchAuthService = module.get(TwitchAuthService);

    twitchAuthService.getAppAccessToken.mockResolvedValue('FAKE_ACCESS_TOKEN');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#getUser()', () => {
    beforeEach(() => {
      httpService.get.mockReturnValue(
        of({
          data: {
            data: [
              {
                id: '44322889',
                login: 'dallas',
                display_name: 'dallas',
                type: 'staff',
                broadcaster_type: '',
                description: 'Just a gamer playing games and chatting. :)',
                profile_image_url:
                  'https://static-cdn.jtvnw.net/jtv_user_pictures/dallas-profile_image-1a2c906ee2c35f12-300x300.png',
                offline_image_url:
                  'https://static-cdn.jtvnw.net/jtv_user_pictures/dallas-channel_offline_image-1a2c906ee2c35f12-1920x1080.png',
                view_count: 191836881,
                email: 'login@provider.com',
              },
            ],
          },
        } as AxiosResponse<TwitchTvGetUsersResponse>),
      );
    });

    it('should return a user', async () => {
      const user = await service.getUser('FAKE_ACCESS_TOKEN');
      expect(httpService.get).toHaveBeenCalledWith(
        'https://api.twitch.tv/helix/users',
        {
          headers: {
            Authorization: 'Bearer FAKE_ACCESS_TOKEN',
            'Client-ID': 'FAKE_TWITCH_CLIENT_ID',
          },
        },
      );
    });
  });

  describe('#getStreams()', () => {
    beforeEach(() => {
      httpService.get.mockReturnValue(
        of({
          data: {
            data: [
              {
                id: '26007494656',
                user_id: '23161357',
                user_name: 'LIRIK',
                game_id: '417752',
                type: 'live',
                title: "Hey Guys, It's Monday - Twitter: @Lirik",
                viewer_count: 32575,
                started_at: '2017-08-14T16:08:32Z',
                language: 'en',
                thumbnail_url:
                  'https://static-cdn.jtvnw.net/previews-ttv/live_user_lirik-{width}x{height}.jpg',
                tag_ids: ['6ea6bca4-4712-4ab9-a906-e3336a9d8039'],
              },
            ],
            pagination: {
              cursor: 'eyJiIjpudWxsLCJhIjp7Ik9mZnNldCI6MjB9fQ==',
            },
          },
        } as unknown as AxiosResponse<TwitchTvGetStreamsResponse>),
      );
    });

    it('should return a list of streams', async () => {
      await service.getStreams({
        userIds: ['23161357'],
        userLogins: ['LIRIK'],
      });
      expect(httpService.get).toHaveBeenCalledWith(
        'https://api.twitch.tv/helix/streams',
        {
          headers: {
            Authorization: 'Bearer FAKE_ACCESS_TOKEN',
            'Client-ID': 'FAKE_TWITCH_CLIENT_ID',
          },
          params: {
            user_id: ['23161357'],
            user_login: ['LIRIK'],
          },
        },
      );
    });
  });
});
