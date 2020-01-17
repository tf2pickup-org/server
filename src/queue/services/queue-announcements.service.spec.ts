import { Test, TestingModule } from '@nestjs/testing';
import { QueueAnnouncementsService } from './queue-announcements.service';
import { GamesService } from '@/games/services/games.service';

class GamesServiceStub {
  getGamesWithSubstitutionRequests() {
    return [
      {
        id: 'FAKE_GAME_ID',
        number: 234,
        teams: new Map([[1, 'RED'], [2, 'BLU']]),
        slots: [
          {
            gameClass: 'soldier',
            teamId: 1,
            status: 'waiting for substitute',
          },
          {
            gameClass: 'soldier',
            teamId: 2,
            status: 'active',
          },
        ],
      },
    ];
  }
}

describe('QueueAnnouncementsService', () => {
  let service: QueueAnnouncementsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueAnnouncementsService,
        { provide: GamesService, useClass: GamesServiceStub },
      ],
    }).compile();

    service = module.get<QueueAnnouncementsService>(QueueAnnouncementsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('substituteRequests()', () => {
    it('should return substitution requests', async () => {
      const ret = await service.substituteRequests();
      expect(ret).toEqual([
        {
          gameId: 'FAKE_GAME_ID',
          gameNumber: 234,
          gameClass: 'soldier',
          team: 'RED',
        },
      ]);
    });
  });
});
