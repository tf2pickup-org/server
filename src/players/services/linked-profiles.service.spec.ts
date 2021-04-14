import { Test, TestingModule } from '@nestjs/testing';
import { LinkedProfilesService } from './linked-profiles.service';

describe('LinkedProfilesService', () => {
  let service: LinkedProfilesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LinkedProfilesService],
    }).compile();

    service = module.get<LinkedProfilesService>(LinkedProfilesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#getLinkedProfiles()', () => {
    beforeEach(() => {
      service.registerLinkedProfileProvider({
        name: 'test',
        fetchProfile: (playerId) =>
          Promise.resolve({
            playerId,
            test: 'test',
          }),
      });
    });

    it('should fetch the linked profile', async () => {
      const linkedProfiles = await service.getLinkedProfiles('FAKE_PLAYER_ID');
      expect(linkedProfiles).toEqual([
        {
          provider: 'test',
          playerId: 'FAKE_PLAYER_ID',
          test: 'test',
        },
      ]);
    });
  });
});
