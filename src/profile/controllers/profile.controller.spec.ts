import { Test, TestingModule } from '@nestjs/testing';
import { ProfileController } from './profile.controller';
import { Player } from '@/players/models/player';

describe('Profile Controller', () => {
  let controller: ProfileController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfileController],
    }).compile();

    controller = module.get<ProfileController>(ProfileController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('#getProfile()', () => {
    it('should return the logged-in user\'s profile', () => {
      const user: Player = { name: 'FAKE_USER_NAME', steamId: 'FAKE_STEAM_ID', hasAcceptedRules: false };
      expect(controller.getProfile(user)).toEqual(user);
    });
  });
});
