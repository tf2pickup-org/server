import { Test, TestingModule } from '@nestjs/testing';
import { ProfileController } from './profile.controller';
import { Player } from '@/players/models/player';
import { PlayersService } from '@/players/services/players.service';
import { PlayerBansService } from '@/players/services/player-bans.service';
import { MapVoteService } from '@/queue/services/map-vote.service';
import { BadRequestException } from '@nestjs/common';
import { PlayerPreferencesService } from '@/player-preferences/services/player-preferences.service';
import { LinkedProfilesService } from '@/players/services/linked-profiles.service';
import { Types } from 'mongoose';

jest.mock('@/player-preferences/services/player-preferences.service');
jest.mock('@/players/services/linked-profiles.service');

class PlayersServiceStub {
  acceptTerms(playerId: string) {
    return null;
  }
}

class PlayerBansServiceStub {
  getPlayerActiveBans(playerId: string) {
    return new Promise((resolve) => resolve([]));
  }
}

class MapVoteServiceStub {
  playerVote(playerId: string) {
    return 'cp_badlands';
  }
}

describe('Profile Controller', () => {
  let controller: ProfileController;
  let playersService: PlayersServiceStub;
  let playerPreferencesService: jest.Mocked<PlayerPreferencesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: PlayersService, useClass: PlayersServiceStub },
        { provide: PlayerBansService, useClass: PlayerBansServiceStub },
        { provide: MapVoteService, useClass: MapVoteServiceStub },
        PlayerPreferencesService,
        LinkedProfilesService,
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

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('#getProfile()', () => {
    it("should return the logged-in user's profile", async () => {
      const profile = {
        player: {
          id: 'FAKE_ID',
          name: 'FAKE_USER_NAME',
          steamId: 'FAKE_STEAM_ID',
          linkedProfilesUrl: '',
          _links: [],
        },
        bans: [],
        mapVote: 'cp_badlands',
        preferences: new Map([['sound-volume', '0.5']]),
      };
      expect(await controller.getProfile(profile.player)).toEqual(profile);
    });

    it('should return active game id', async () => {
      const gameId = new Types.ObjectId();
      const player = {
        id: 'FAKE_ID',
        name: 'FAKE_USER_NAME',
        steamId: 'FAKE_STEAM_ID',
        activeGame: gameId,
        linkedProfilesUrl: '',
        _links: [],
      };
      expect(await controller.getProfile(player)).toEqual(
        expect.objectContaining({ activeGameId: gameId.toString() }),
      );
    });
  });

  describe('#getPreferences()', () => {
    it("should return the user's preferences", async () => {
      const ret = await controller.getPreferences({
        id: 'FAKE_USER_ID',
      } as Player);
      expect(ret.size).toEqual(1);
      expect(ret.get('sound-volume')).toEqual('0.5');
    });
  });

  describe('#savePreferences()', () => {
    it("should update user's preferences", async () => {
      const ret = await controller.savePreferences(
        { id: 'FAKE_USER_ID' } as Player,
        { 'sound-volume': '0.9' },
      );
      expect(ret.size).toEqual(1);
      expect(ret.get('sound-volume')).toEqual('0.9');
      expect(
        playerPreferencesService.updatePlayerPreferences,
      ).toHaveBeenCalledWith(
        'FAKE_USER_ID',
        new Map([['sound-volume', '0.9']]),
      );
    });
  });

  describe('#acceptTerms', () => {
    it('should call players service', async () => {
      const spy = jest.spyOn(playersService, 'acceptTerms');
      await controller.acceptTerms({ id: 'FAKE_ID' } as Player, '');
      expect(spy).toHaveBeenCalledWith('FAKE_ID');
    });

    it('should reject invalid requests', async () => {
      await expect(
        controller.acceptTerms({ id: 'FAKE_ID' } as Player, undefined),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
