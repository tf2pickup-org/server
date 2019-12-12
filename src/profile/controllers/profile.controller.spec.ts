import { Test, TestingModule } from '@nestjs/testing';
import { ProfileController } from './profile.controller';
import { Player } from '@/players/models/player';
import { PlayersService } from '@/players/services/players.service';

class PlayersServiceStub {
  acceptTerms(playerId: string) { return null; }
}

describe('Profile Controller', () => {
  let controller: ProfileController;
  let playersService: PlayersServiceStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: PlayersService, useClass: PlayersServiceStub },
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
    it('should return the logged-in user\'s profile', () => {
      const user: Player = { _id: 'FAKE_ID', name: 'FAKE_USER_NAME', steamId: 'FAKE_STEAM_ID', hasAcceptedRules: false };
      expect(controller.getProfile(user)).toEqual(user);
    });
  });

  describe('#acceptTerms', () => {
    it('should call players service', async () => {
      const spy = spyOn(playersService, 'acceptTerms');
      await controller.acceptTerms({ _id: 'FAKE_ID' } as Player, '');
      expect(spy).toHaveBeenCalledWith('FAKE_ID');
    });

    it('should reject invalid requests', async () => {
      await expectAsync(controller.acceptTerms({ _id: 'FAKE_ID' } as Player, undefined)).toBeRejected();
    });
  });
});
