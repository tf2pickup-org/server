import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { PlayerId } from '../types/player-id';
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
        name: 'twitch.tv',
        fetchProfile: (playerId) =>
          Promise.resolve({
            playerId: playerId,
            test: 'test',
          }),
      });
    });

    it('should fetch the linked profile', async () => {
      const playerId = new Types.ObjectId() as PlayerId;
      const linkedProfiles = await service.getLinkedProfiles(playerId);
      expect(linkedProfiles).toEqual([
        {
          provider: 'twitch.tv',
          playerId: expect.any(Object),
          test: 'test',
        },
      ]);
    });
  });
});
