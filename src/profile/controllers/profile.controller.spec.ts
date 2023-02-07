import { Test, TestingModule } from '@nestjs/testing';
import { ProfileController } from './profile.controller';
import { Player } from '@/players/models/player';
import { PlayersService } from '@/players/services/players.service';
import { BadRequestException } from '@nestjs/common';
import { PlayerPreferencesService } from '@/player-preferences/services/player-preferences.service';
import { ProfileService } from '../services/profile.service';

jest.mock('@/player-preferences/services/player-preferences.service');
jest.mock('../services/profile.service');

class PlayersServiceStub {
  acceptTerms = jest.fn().mockResolvedValue(null);
}

describe('Profile Controller', () => {
  let controller: ProfileController;
  let playersService: PlayersServiceStub;
  let playerPreferencesService: jest.Mocked<PlayerPreferencesService>;
  let player: Player;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: PlayersService, useClass: PlayersServiceStub },
        PlayerPreferencesService,
        ProfileService,
      ],
      controllers: [ProfileController],
    }).compile();

    controller = module.get<ProfileController>(ProfileController);
    playersService = module.get(PlayersService);
    playerPreferencesService = module.get(PlayerPreferencesService);
  });

  beforeEach(() => {
    playerPreferencesService.getPlayerPreferences.mockResolvedValue(
      new Map([['sound-volume', '0.5']]),
    );
    playerPreferencesService.updatePlayerPreferences.mockResolvedValue(
      new Map([['sound-volume', '0.9']]),
    );
  });

  beforeEach(() => {
    player = new Player();
    player.id = 'FAKE_ID';
    player.name = 'FAKE_USER_NAME';
    player.steamId = 'FAKE_STEAM_ID';
    player.roles = [];
    player.avatar = {
      small: 'AVATAR_SMALL',
      medium: 'AVATAR_MEDIUM',
      large: 'AVATAR_LARGE',
    };
    player.hasAcceptedRules = true;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('#getPreferences()', () => {
    it("should return the user's preferences", async () => {
      const ret = await controller.getPreferences(player);
      expect(ret['sound-volume']).toEqual('0.5');
    });
  });

  describe('#savePreferences()', () => {
    it("should update user's preferences", async () => {
      const ret = await controller.savePreferences(player, {
        'sound-volume': '0.9',
      });
      expect(ret['sound-volume']).toEqual('0.9');
      expect(
        playerPreferencesService.updatePlayerPreferences,
      ).toHaveBeenCalledWith(player._id, new Map([['sound-volume', '0.9']]));
    });
  });

  describe('#acceptTerms', () => {
    it('should call players service', async () => {
      await controller.acceptTerms(player, '');
      expect(playersService.acceptTerms).toHaveBeenCalledWith(player._id);
    });

    it('should reject invalid requests', async () => {
      // skipcq: JS-0127
      await expect(controller.acceptTerms(player, undefined)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
