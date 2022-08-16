import { Test, TestingModule } from '@nestjs/testing';
import { ProfileController } from './profile.controller';
import { Player } from '@/players/models/player';
import { PlayersService } from '@/players/services/players.service';
import { PlayerBansService } from '@/players/services/player-bans.service';
import { MapVoteService } from '@/queue/services/map-vote.service';
import { BadRequestException } from '@nestjs/common';
import { PlayerPreferencesService } from '@/player-preferences/services/player-preferences.service';
import { LinkedProfilesService } from '@/players/services/linked-profiles.service';
import { serialize } from '@/shared/serialize';
import { Types } from 'mongoose';

jest.mock('@/player-preferences/services/player-preferences.service');
jest.mock('@/players/services/linked-profiles.service', () => ({
  LinkedProfilesService: jest.fn().mockImplementation(() => ({
    getLinkedProfiles: jest.fn().mockResolvedValue([]),
  })),
}));

class PlayersServiceStub {
  acceptTerms = jest.fn().mockResolvedValue(null);
}

class PlayerBansServiceStub {
  getPlayerActiveBans = jest.fn().mockResolvedValue([]);
}

class MapVoteServiceStub {
  playerVote = jest.fn().mockReturnValue('cp_badlands');
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

  describe('#getProfile()', () => {
    it("should return the logged-in user's profile", async () => {
      const res = await controller.getProfile(player);
      const serialized = await serialize(res);
      expect(serialized).toEqual({
        player: {
          id: 'FAKE_ID',
          name: 'FAKE_USER_NAME',
          steamId: 'FAKE_STEAM_ID',
          avatar: {
            small: 'AVATAR_SMALL',
            medium: 'AVATAR_MEDIUM',
            large: 'AVATAR_LARGE',
          },
          roles: [],
          _links: [
            {
              href: '/players/FAKE_ID/linked-profiles',
              title: 'Linked profiles',
            },
          ],
        },
        hasAcceptedRules: true,
        activeGameId: undefined,
        bans: [],
        mapVote: 'cp_badlands',
        preferences: {
          'sound-volume': '0.5',
        },
        linkedProfiles: [],
      });
    });

    describe('when the user is involved in an active game', () => {
      beforeEach(() => {
        player.activeGame = new Types.ObjectId();
      });

      it('should return active game id', async () => {
        const res = await controller.getProfile(player);
        expect(await serialize(res)).toEqual(
          expect.objectContaining({
            activeGameId: player.activeGame.toString(),
          }),
        );
      });
    });
  });

  describe('#getPreferences()', () => {
    it("should return the user's preferences", async () => {
      const ret = await controller.getPreferences(player);
      expect(ret.size).toEqual(1);
      expect(ret['sound-volume']).toEqual('0.5');
    });
  });

  describe('#savePreferences()', () => {
    it("should update user's preferences", async () => {
      const ret = await controller.savePreferences(player, {
        'sound-volume': '0.9',
      });
      expect(ret.size).toEqual(1);
      expect(ret['sound-volume']).toEqual('0.9');
      expect(
        playerPreferencesService.updatePlayerPreferences,
      ).toHaveBeenCalledWith('FAKE_ID', new Map([['sound-volume', '0.9']]));
    });
  });

  describe('#acceptTerms', () => {
    it('should call players service', async () => {
      await controller.acceptTerms(player, '');
      expect(playersService.acceptTerms).toHaveBeenCalledWith('FAKE_ID');
    });

    it('should reject invalid requests', async () => {
      await expect(controller.acceptTerms(player, undefined)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
