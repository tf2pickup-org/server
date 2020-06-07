import { Test, TestingModule } from '@nestjs/testing';
import { ProfileController } from './profile.controller';
import { Player } from '@/players/models/player';
import { PlayersService } from '@/players/services/players.service';
import { GamesService } from '@/games/services/games.service';
import { PlayerBansService } from '@/players/services/player-bans.service';
import { MapVoteService } from '@/queue/services/map-vote.service';
import { BadRequestException } from '@nestjs/common';
import { ObjectId } from 'mongodb';

class PlayersServiceStub {
  acceptTerms(playerId: string) { return null; }
}

class GamesServiceStub {
  getPlayerActiveGame(playerId: string) { return new Promise(resolve => resolve(null)); }
}

class PlayerBansServiceStub {
  getPlayerActiveBans(playerId: string) { return new Promise(resolve => resolve([])); }
}

class MapVoteServiceStub {
  playerVote(playerId: string) { return 'cp_badlands'; }
}

describe('Profile Controller', () => {
  let controller: ProfileController;
  let playersService: PlayersServiceStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: PlayersService, useClass: PlayersServiceStub },
        { provide: GamesService, useClass: GamesServiceStub },
        { provide: PlayerBansService, useClass: PlayerBansServiceStub },
        { provide: MapVoteService, useClass: MapVoteServiceStub },
      ],
      controllers: [ProfileController],
    }).compile();

    controller = module.get<ProfileController>(ProfileController);
    playersService = module.get(PlayersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('#getProfile()', () => {
    it('should return the logged-in user\'s profile', async () => {
      const playerId = new ObjectId();
      const profile = { id: playerId.toString(), name: 'FAKE_USER_NAME', steamId: 'FAKE_STEAM_ID', hasAcceptedRules: false, activeGameId: null,
        bans: [], mapVote: 'cp_badlands' };
      expect(await controller.getProfile(profile)).toEqual(profile);
    });
  });

  describe('#acceptTerms', () => {
    let playerId: ObjectId;

    beforeEach(() => {
      playerId = new ObjectId();
    });

    it('should call players service', async () => {
      const spy = jest.spyOn(playersService, 'acceptTerms');
      await controller.acceptTerms({ id: playerId.toString() } as Player, '');
      expect(spy).toHaveBeenCalledWith(playerId);
    });

    it('should reject invalid requests', async () => {
      await expect(controller.acceptTerms({ id: playerId.toString() } as Player, undefined)).rejects.toThrow(BadRequestException);
    });
  });
});
