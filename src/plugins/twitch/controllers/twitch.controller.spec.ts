import { Test, TestingModule } from '@nestjs/testing';
import { TwitchController } from './twitch.controller';
import { TwitchService } from '../services/twitch.service';
import { TwitchAuthService } from '../services/twitch-auth.service';
import { AuthService } from '@/auth/services/auth.service';
import { JsonWebTokenError } from 'jsonwebtoken';
import { BadRequestException } from '@nestjs/common';
import { Player } from '@/players/models/player';
import { Types } from 'mongoose';
import { PlayerId } from '@/players/types/player-id';

jest.mock('../services/twitch.service');
jest.mock('../services/twitch-auth.service');
jest.mock('@/auth/services/auth.service');

describe('Twitch Controller', () => {
  let controller: TwitchController;
  let authService: jest.Mocked<AuthService>;
  let twitchService: jest.Mocked<TwitchService>;
  let twitchAuthService: jest.Mocked<TwitchAuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TwitchController],
      providers: [TwitchService, TwitchAuthService, AuthService],
    }).compile();

    controller = module.get<TwitchController>(TwitchController);
    authService = module.get(AuthService);
    twitchService = module.get(TwitchService);
    twitchAuthService = module.get(TwitchAuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('#authenticate()', () => {
    beforeEach(() => {
      authService.verifyToken.mockReturnValue({ id: 'FAKE_USER_ID' } as any);
      authService.generateJwtToken.mockReturnValue('FAKE_JWT');
      twitchAuthService.getOauthRedirectUrl.mockImplementation(
        (state) => `FAKE_REDIRECT_URL?state=${state}`,
      );
    });

    it('should return redirect url', () => {
      const ret = controller.authenticate({ id: 'FAKE_USER_ID' } as Player);
      expect(ret).toEqual({
        url: 'FAKE_REDIRECT_URL?state=FAKE_JWT',
      });
    });
  });

  describe('#authenticationCallback()', () => {
    let playerId: PlayerId;

    beforeEach(() => {
      playerId = new Types.ObjectId() as PlayerId;
      authService.verifyToken.mockReturnValue({
        id: playerId.toString(),
      } as any);
    });

    it('should link the twitch.tv account', async () => {
      await controller.authenticationCallback('FAKE_CODE', 'FAKE_STATE');
      expect(twitchService.saveUserProfile).toHaveBeenCalledWith(
        playerId,
        'FAKE_CODE',
      );
    });
  });

  describe('#disconnect()', () => {
    let playerId: PlayerId;

    beforeEach(() => {
      playerId = new Types.ObjectId() as PlayerId;
      twitchService.deleteUserProfile.mockResolvedValue({
        userId: 'FAKE_USER_ID',
        login: 'FAKE_LOGIN',
        player: playerId,
      });
    });

    it('should remove the twitch.tv profile', async () => {
      const ret = await controller.disconnect({ _id: playerId } as Player);
      expect(twitchService.deleteUserProfile).toHaveBeenCalledWith(playerId);
      expect(ret).toEqual({
        userId: 'FAKE_USER_ID',
        login: 'FAKE_LOGIN',
        player: playerId,
      });
    });
  });

  describe('#getStreams()', () => {
    const streams = [
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

    beforeEach(() => {
      Object.defineProperty(twitchService, 'streams', {
        get: jest.fn().mockReturnValue(streams),
      });
    });

    it('should return streams', () => {
      expect(controller.getStreams()).toEqual(twitchService.streams);
    });
  });
});
