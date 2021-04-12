import { Test, TestingModule } from '@nestjs/testing';
import { TwitchService } from './twitch.service';
import { PlayersService } from '@/players/services/players.service';
import { HttpService } from '@nestjs/common';
import { Environment } from '@/environment/environment';
import { of } from 'rxjs';
import { TwitchGateway } from '../gateways/twitch.gateway';
import { TwitchAuthService } from './twitch-auth.service';
import { PlayerBansService } from '@/players/services/player-bans.service';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { TwitchTvProfile } from '../models/twitch-tv-profile';
import { typegooseTestingModule } from '@/utils/testing-typegoose-module';
import { getModelToken, TypegooseModule } from 'nestjs-typegoose';
import { Player } from '@/players/models/player';
import { ReturnModelType } from '@typegoose/typegoose';

jest.mock('../gateways/twitch.gateway');
jest.mock('./twitch-auth.service');
jest.mock('@/players/services/player-bans.service');
jest.mock('@/players/services/players.service');

class HttpServiceStub {
  get(url: string, options: any) {
    return of();
  }
}

const environment = {
  apiUrl: 'FAKE_API_URL',
  twitchClientId: 'FAKE_TWITCH_CLIENT_ID',
};

describe('TwitchService', () => {
  let service: TwitchService;
  let mongod: MongoMemoryServer;
  let httpService: HttpServiceStub;
  let playerBansService: jest.Mocked<PlayerBansService>;
  let twitchAuthService: jest.Mocked<TwitchAuthService>;
  let playersService: jest.Mocked<PlayersService>;
  let twitchTvProfileModel: ReturnModelType<typeof TwitchTvProfile>;

  beforeAll(() => (mongod = new MongoMemoryServer()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        typegooseTestingModule(mongod),
        TypegooseModule.forFeature([Player, TwitchTvProfile]),
      ],
      providers: [
        TwitchService,
        PlayersService,
        { provide: HttpService, useClass: HttpServiceStub },
        { provide: Environment, useValue: environment },
        TwitchGateway,
        TwitchAuthService,
        PlayerBansService,
      ],
    }).compile();

    service = module.get<TwitchService>(TwitchService);
    httpService = module.get(HttpService);
    playerBansService = module.get(PlayerBansService);
    twitchAuthService = module.get(TwitchAuthService);
    playersService = module.get(PlayersService);
    twitchTvProfileModel = module.get(getModelToken(TwitchTvProfile.name));
  });

  // @ts-expect-error
  afterEach(async () => await playersService._reset());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#fetchUserProfile()', () => {
    let spy;

    beforeEach(() => {
      spy = jest.spyOn(httpService, 'get').mockReturnValue(
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
        }),
      );
    });

    it('should query the correct endpoint', async () => {
      await service.fetchUserProfile('FAKE_ACCESS_TOKEN');
      expect(spy).toHaveBeenCalledWith(expect.stringMatching(/\/users$/), {
        headers: {
          Authorization: 'Bearer FAKE_ACCESS_TOKEN',
          'Client-ID': 'FAKE_TWITCH_CLIENT_ID',
        },
      });
    });
  });

  describe('#saveUserProfile()', () => {
    const twitchTvProfile = {
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
    };

    let player: Player;

    beforeEach(async () => {
      twitchAuthService.fetchUserAccessToken.mockResolvedValue(
        'FAKE_USER_TOKEN',
      );
      jest.spyOn(httpService, 'get').mockReturnValue(
        of({
          data: {
            data: [twitchTvProfile],
          },
        }),
      );

      // @ts-expect-error
      player = await playersService._createOne();
    });

    it('should register twitch.tv profile', async () => {
      await service.saveUserProfile(player.id, 'FAKE_CODE');

      const profile = await twitchTvProfileModel.findOne({ player: player.id });
      expect(profile).toBeTruthy();
      expect(profile.userId).toEqual('44322889');
      expect(profile.login).toEqual('dallas');
      expect(profile.displayName).toEqual('dallas');
      expect(profile.profileImageUrl).toEqual(
        'https://static-cdn.jtvnw.net/jtv_user_pictures/dallas-profile_image-1a2c906ee2c35f12-300x300.png',
      );
    });
  });

  describe('#pollUsersStreams()', () => {
    beforeEach(async () => {
      jest.spyOn(httpService, 'get').mockReturnValue(
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
        }),
      );

      // @ts-expect-error
      const player = await playersService._createOne();
      await twitchTvProfileModel.create({
        player: player.id,
        userId: '23161357',
        login: 'LIRIK',
        displayName: 'LIRIK',
        profileImageUrl:
          'https://static-cdn.jtvnw.net/previews-ttv/live_user_lirik-{width}x{height}.jpg',
      });

      playerBansService.getPlayerActiveBans.mockResolvedValue([]);
    });

    it('should refresh all streams', async () => {
      await service.pollUsersStreams();
      expect(service.streams.length).toEqual(1);
    });

    describe('when a user is banned', () => {
      beforeEach(() => {
        playerBansService.getPlayerActiveBans.mockResolvedValue([{} as any]);
      });

      it('should not add his stream to the list of streams', async () => {
        await service.pollUsersStreams();
        expect(service.streams.length).toEqual(0);
      });
    });
  });
});
