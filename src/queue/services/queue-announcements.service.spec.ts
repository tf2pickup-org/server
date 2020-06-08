import { Test, TestingModule } from '@nestjs/testing';
import { QueueAnnouncementsService } from './queue-announcements.service';
import { GamesService } from '@/games/services/games.service';
import { ObjectId } from 'mongodb';
import { SubstituteRequest } from '../substitute-request';

jest.mock('@/games/services/games.service');

const mockGame = {
  id: new ObjectId(),
  number: 234,
  slots: [
    {
      gameClass: 'soldier',
      team: 'blu',
      status: 'waiting for substitute',
    },
    {
      gameClass: 'soldier',
      team: 'red',
      status: 'active',
    },
  ],
} as any;

describe('QueueAnnouncementsService', () => {
  let service: QueueAnnouncementsService;
  let gamesService: GamesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueAnnouncementsService,
        { provide: GamesService, useClass: GamesService },
      ],
    }).compile();

    service = module.get<QueueAnnouncementsService>(QueueAnnouncementsService);
    gamesService = module.get(GamesService);
  });

  beforeEach(() => {
    gamesService.getGamesWithSubstitutionRequests = () => Promise.resolve([ mockGame ]);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('substituteRequests()', () => {
    it('should return substitution requests', async () => {
      const ret = await service.substituteRequests();
      expect(ret).toEqual([
        {
          gameId: mockGame.id,
          gameNumber: 234,
          gameClass: 'soldier',
          team: 'blu',
        },
      ]);
    });
  });
});
