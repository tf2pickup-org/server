import { Test, TestingModule } from '@nestjs/testing';
import { QueueAnnouncementsService } from './queue-announcements.service';
import { GamesService } from '@/games/services/games.service';
import { Tf2Team } from '@/games/models/tf2-team';

class GamesServiceStub {
  getGamesWithSubstitutionRequests() {
    return [
      {
        id: 'FAKE_GAME_ID',
        number: 234,
        slots: [
          {
            gameClass: 'soldier',
            team: Tf2Team.Blu,
            status: 'waiting for substitute',
          },
          {
            gameClass: 'soldier',
            team: Tf2Team.Red,
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
          team: 'BLU',
        },
      ]);
    });
  });
});
