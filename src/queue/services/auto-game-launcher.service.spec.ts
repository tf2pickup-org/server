import { Test, TestingModule } from '@nestjs/testing';
import { AutoGameLauncherService } from './auto-game-launcher.service';
import { QueueService } from './queue.service';
import { MapVoteService } from './map-vote.service';
import { GamesService } from '@/games/services/games.service';
import { FriendsService } from './friends.service';
import { Events } from '@/events/events';

jest.mock('./friends.service');
jest.mock('./queue.service');
jest.mock('./map-vote.service');

class GamesServiceStub {
  create = jest.fn().mockReturnValue({ id: 'FAKE_GAME_ID' });
  launch = jest.fn().mockResolvedValue({ id: 'FAKE_GAME_ID' });
}

describe('AutoGameLauncherService', () => {
  let service: AutoGameLauncherService;
  let queueService: QueueService;
  let gamesService: GamesService;
  let events: Events;

  beforeEach(() => {
    // @ts-expect-error
    MapVoteService.mockImplementation(() => ({
      getWinner: () => 'cp_badlands',
    }));

    // @ts-expect-error
    FriendsService.mockImplementation(() => ({
      friendships: [{ sourcePlayerId: 'FAKE_MEDIC', targetPlayerId: 'FAKE_DM_CLASS' }],
    }));

    // @ts-expect-error
    QueueService.mockImplementation(() => ({
      slots: [
        { id: 0, playerId: 'FAKE_PLAYER_ID_1', gameClass: 'soldier', ready: true },
        { id: 1, playerId: 'FAKE_PLAYER_ID_2', gameClass: 'soldier', ready: true },
      ],
      reset: jest.fn(),
    }));
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutoGameLauncherService,
        QueueService,
        MapVoteService,
        { provide: GamesService, useClass: GamesServiceStub },
        FriendsService,
        Events,
      ],
    }).compile();

    service = module.get<AutoGameLauncherService>(AutoGameLauncherService);
    queueService = module.get(QueueService);
    gamesService = module.get(GamesService);
    events = module.get(Events);

    service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should launch the game and reset the queue', async () => {
    return new Promise<void>(resolve => {
      events.queueStateChange.next({ state: 'launching' });

      setImmediate(() => {
        expect(queueService.reset).toHaveBeenCalled();
        expect(gamesService.create).toHaveBeenCalledWith(queueService.slots, 'cp_badlands', [['FAKE_MEDIC', 'FAKE_DM_CLASS']]);
        expect(gamesService.launch).toHaveBeenCalledWith('FAKE_GAME_ID');
        resolve();
      });
    });
  });
});
