import { Test, TestingModule } from '@nestjs/testing';
import { TwitchService } from './twitch.service';
import { PlayersService } from '@/players/services/players.service';
// eslint-disable-next-line jest/no-mocks-import
import { PlayersService as MockPlayersService } from '@/players/services/__mocks__/players.service';
import { TwitchGateway } from '../gateways/twitch.gateway';
import { TwitchAuthService } from './twitch-auth.service';
import { PlayerBansService } from '@/players/services/player-bans.service';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  TwitchTvProfile,
  twitchTvProfileSchema,
} from '../models/twitch-tv-profile';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import { Player, playerSchema } from '@/players/models/player';
import { LinkedProfilesService } from '@/players/services/linked-profiles.service';
import { Events } from '@/events/events';
import { Connection, Error, Model, Types } from 'mongoose';
import {
  getConnectionToken,
  getModelToken,
  MongooseModule,
} from '@nestjs/mongoose';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { PlayerId } from '@/players/types/player-id';
import { TwitchTvApiService } from './twitch-tv-api.service';

jest.mock('../gateways/twitch.gateway');
jest.mock('./twitch-auth.service');
jest.mock('@/players/services/player-bans.service');
jest.mock('@/players/services/players.service');
jest.mock('@/players/services/linked-profiles.service');
jest.mock('@/configuration/services/configuration.service');
jest.mock('./twitch-tv-api.service');

describe('TwitchService', () => {
  let service: TwitchService;
  let mongod: MongoMemoryServer;
  let playerBansService: jest.Mocked<PlayerBansService>;
  let twitchAuthService: jest.Mocked<TwitchAuthService>;
  let playersService: MockPlayersService;
  let twitchTvProfileModel: Model<TwitchTvProfile>;
  let linkedProfilesService: jest.Mocked<LinkedProfilesService>;
  let twitchTvApiService: jest.Mocked<TwitchTvApiService>;
  let events: Events;
  let connection: Connection;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        mongooseTestingModule(mongod),
        MongooseModule.forFeature([
          { name: Player.name, schema: playerSchema },
          { name: TwitchTvProfile.name, schema: twitchTvProfileSchema },
        ]),
      ],
      providers: [
        TwitchService,
        PlayersService,
        TwitchGateway,
        TwitchAuthService,
        PlayerBansService,
        LinkedProfilesService,
        Events,
        ConfigurationService,
        TwitchTvApiService,
      ],
    }).compile();

    service = module.get<TwitchService>(TwitchService);
    playerBansService = module.get(PlayerBansService);
    twitchAuthService = module.get(TwitchAuthService);
    playersService = module.get(PlayersService);
    twitchTvProfileModel = module.get(getModelToken(TwitchTvProfile.name));
    linkedProfilesService = module.get(LinkedProfilesService);
    twitchTvApiService = module.get(TwitchTvApiService);
    events = module.get(Events);
    connection = module.get(getConnectionToken());
  });

  afterEach(async () => {
    await playersService._reset();
    await connection.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#onModuleInit()', () => {
    beforeEach(() => {
      service.onModuleInit();
    });

    it('should register linked profile provider', () => {
      expect(
        linkedProfilesService.registerLinkedProfileProvider,
      ).toHaveBeenCalledWith({
        name: 'twitch.tv',
        fetchProfile: expect.any(Function),
      });
    });
  });

  describe('#getTwitchTvProfileByPlayerId()', () => {
    describe('when exists', () => {
      let player: Player;

      beforeEach(async () => {
        player = await playersService._createOne();
        await twitchTvProfileModel.create({
          player: player._id,
          userId: '44322889',
          login: 'dallas',
          displayName: 'dallas',
          profileImageUrl:
            'https://static-cdn.jtvnw.net/jtv_user_pictures/dallas-profile_image-1a2c906ee2c35f12-300x300.png',
        });
      });

      it('should return the requested twitch.tv profile', async () => {
        const profile = await service.getTwitchTvProfileByPlayerId(player._id);
        expect(profile.player.toString()).toEqual(player.id);
        expect(profile.userId).toEqual('44322889');
      });
    });

    describe('when does not exist', () => {
      it('should throw an error', async () => {
        await expect(
          service.getTwitchTvProfileByPlayerId(
            new Types.ObjectId() as PlayerId,
          ),
        ).rejects.toThrow(Error.DocumentNotFoundError);
      });
    });
  });

  describe('#saveUserProfile()', () => {
    let player: Player;

    beforeEach(async () => {
      twitchAuthService.fetchUserAccessToken.mockResolvedValue(
        'FAKE_USER_TOKEN',
      );
      twitchTvApiService.getUser.mockResolvedValue({
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
      });

      player = await playersService._createOne();
    });

    it('should register twitch.tv profile', async () => {
      await service.saveUserProfile(player._id, 'FAKE_CODE');

      const profile = await twitchTvProfileModel
        .findOne({
          player: player._id,
        })
        .orFail();
      expect(profile.userId).toEqual('44322889');
      expect(profile.login).toEqual('dallas');
      expect(profile.displayName).toEqual('dallas');
      expect(profile.profileImageUrl).toEqual(
        'https://static-cdn.jtvnw.net/jtv_user_pictures/dallas-profile_image-1a2c906ee2c35f12-300x300.png',
      );
    });

    it('should emit the linkedProfilesChanged event', () =>
      new Promise<void>((resolve) => {
        events.linkedProfilesChanged.subscribe(({ playerId }) => {
          expect(playerId).toEqual(player._id);
          resolve();
        });

        // skipcq: JS-0116
        service.saveUserProfile(player._id, 'FAKE_CODE');
      }));
  });

  describe('#deleteUserProfile()', () => {
    let player: Player;

    beforeEach(async () => {
      player = await playersService._createOne();
      await twitchTvProfileModel.create({
        player: player._id,
        userId: '44322889',
        login: 'dallas',
        displayName: 'dallas',
        profileImageUrl:
          'https://static-cdn.jtvnw.net/jtv_user_pictures/dallas-profile_image-1a2c906ee2c35f12-300x300.png',
      });
    });

    it('should return the deleted twitch.tv profile', async () => {
      const profile = await service.deleteUserProfile(player._id);
      expect(profile.player.toString()).toEqual(player.id);
    });

    it('should emit the linkedProfilesChanged event', () =>
      new Promise<void>((resolve) => {
        events.linkedProfilesChanged.subscribe(({ playerId }) => {
          expect(playerId).toEqual(player._id);
          resolve();
        });

        // skipcq: JS-0116
        service.deleteUserProfile(player._id);
      }));
  });

  describe('#pollUsersStreams()', () => {
    beforeEach(async () => {
      twitchTvApiService.getStreams.mockResolvedValue([
        {
          id: '26007494656',
          user_id: '23161357',
          user_name: 'LIRIK',
          user_login: 'LIRIK',
          game_id: '417752',
          game_name: 'Team Fortress 2',
          type: 'live',
          title: "Hey Guys, It's Monday - Twitter: @Lirik",
          viewer_count: 32575,
          started_at: '2017-08-14T16:08:32Z',
          language: 'en',
          thumbnail_url:
            'https://static-cdn.jtvnw.net/previews-ttv/live_user_lirik-{width}x{height}.jpg',
          pagination: '',
          is_mature: false,
        },
      ]);

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

    it('should refresh players streams', async () => {
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

    describe('when fetching a promoted stream', () => {
      beforeEach(() => {
        twitchTvApiService.getStreams.mockResolvedValue([
          {
            id: '42220566028',
            user_id: '21255999',
            user_login: 'kritzkast',
            user_name: 'KritzKast',
            game_id: '16676',
            game_name: 'Team Fortress 2',
            type: 'live',
            title:
              'ETF2L Highlander S24 Premiership W2: Feila eSports vs. inVision',
            viewer_count: 155,
            started_at: '2021-05-30T19:19:04Z',
            language: 'en',
            thumbnail_url:
              'https://static-cdn.jtvnw.net/previews-ttv/live_user_kritzkast-{width}x{height}.jpg',
            is_mature: false,
            pagination: '',
          },
        ]);
      });

      it('should refresh promoted streams', async () => {
        await service.pollUsersStreams();
        expect(service.streams.length).toEqual(1);
        const stream = service.streams[0];
        expect(stream.playerId).toBe(undefined);
        expect(stream.userName).toEqual('KritzKast');
      });
    });
  });
});
