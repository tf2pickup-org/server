import { Test, TestingModule } from '@nestjs/testing';
import { TwitchController } from './twitch.controller';
import { TwitchService } from '../services/twitch.service';
import { TwitchAuthService } from '../services/twitch-auth.service';
import { PlayersService } from '@/players/services/players.service';
import { AuthService } from '@/auth/services/auth.service';
import { JsonWebTokenError } from 'jsonwebtoken';
import { BadRequestException } from '@nestjs/common';
import { Player } from '@/players/models/player';

jest.mock('../services/twitch.service');
jest.mock('../services/twitch-auth.service');
jest.mock('@/auth/services/auth.service');

class PlayersServiceStub {
  registerTwitchAccount(playerId: string, twitchUserId: string) {
    return Promise.resolve();
  }
  removeTwitchTvProfile = jest.fn().mockResolvedValue({ id: 'FAKE_USER_ID' });
}

describe('Twitch Controller', () => {
  let controller: TwitchController;
  let authService: jest.Mocked<AuthService>;
  let playersService: PlayersServiceStub;
  let twitchService: jest.Mocked<TwitchService>;
  let twitchAuthService: jest.Mocked<TwitchAuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TwitchController],
      providers: [
        TwitchService,
        TwitchAuthService,
        { provide: PlayersService, useClass: PlayersServiceStub },
        AuthService,
      ],
    }).compile();

    controller = module.get<TwitchController>(TwitchController);
    authService = module.get(AuthService);
    playersService = module.get(PlayersService);
    twitchService = module.get(TwitchService);
    twitchAuthService = module.get(TwitchAuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('#authenticate()', () => {
    beforeEach(() => {
      authService.verifyToken.mockReturnValue({ id: 'FAKE_USER_ID' } as any);
      authService.generateJwtToken.mockResolvedValue('FAKE_JWT');
      twitchAuthService.getOauthRedirectUrl.mockImplementation(
        (state) => `FAKE_REDIRECT_URL?state=${state}`,
      );
    });

    it('should return redirect url', async () => {
      const ret = await controller.authenticate('FAKE_TOKEN');
      expect(ret).toEqual({
        url: 'FAKE_REDIRECT_URL?state=FAKE_JWT',
      });
    });

    describe('if the jwt is incorrect', () => {
      beforeEach(() => {
        authService.verifyToken.mockImplementation(() => {
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
    beforeEach(() => {
      authService.verifyToken.mockReturnValue({ id: 'FAKE_USER_ID' } as any);
    });

    it('should link the twitch.tv account', async () => {
      await controller.authenticationCallback('FAKE_CODE', 'FAKE_STATE');
      expect(twitchService.saveUserProfile).toHaveBeenCalledWith(
        'FAKE_USER_ID',
        'FAKE_CODE',
      );
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
      // @ts-ignore
      twitchService.streams = streams;
    });

    it('should return streams', () => {
      expect(controller.getStreams()).toEqual(twitchService.streams);
    });
  });
});
