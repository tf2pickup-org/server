import { Test, TestingModule } from '@nestjs/testing';
import { AutoGameLauncherService } from './auto-game-launcher.service';
import { QueueService } from './queue.service';
import { MapVoteService } from './map-vote.service';
import { GamesService } from '@/games/services/games.service';
import { FriendsService } from './friends.service';
import { Events } from '@/events/events';
import { QueueState } from '../queue-state';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { QueueSlot } from '../queue-slot';

jest.mock('./friends.service');
jest.mock('./queue.service');
jest.mock('./map-vote.service');

function flushPromises() {
  return new Promise((resolve) => setImmediate(resolve));
}

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
    (
      MapVoteService as jest.MockedClass<typeof MapVoteService>
    ).mockImplementation(
      () =>
        ({
          getWinner: () => Promise.resolve('cp_badlands'),
        } as MapVoteService),
    );

    // @ts-expect-error
    FriendsService.mockImplementation(() => ({
      friendships: [
        { sourcePlayerId: 'FAKE_MEDIC', targetPlayerId: 'FAKE_DM_CLASS' },
      ],
    }));

    (QueueService as jest.MockedClass<typeof QueueService>).mockImplementation(
      () => {
        const slots: QueueSlot[] = [
          {
            id: 0,
            playerId: 'FAKE_PLAYER_ID_1',
            gameClass: Tf2ClassName.soldier,
            ready: true,
          },
          {
            id: 1,
            playerId: 'FAKE_PLAYER_ID_2',
            gameClass: Tf2ClassName.soldier,
            ready: true,
          },
        ];

        return {
          slots,
          reset: jest.fn(),
          findSlotByPlayerId: jest
            .fn()
            .mockImplementation((playerId) =>
              slots.find((slot) => slot.playerId === playerId),
            ),
        } as unknown as QueueService;
      },
    );
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
    return new Promise<void>((resolve) => {
      events.queueStateChange.next({ state: QueueState.launching });

      setImmediate(() => {
        expect(queueService.reset).toHaveBeenCalled();
        expect(gamesService.create).toHaveBeenCalledWith(
          queueService.slots,
          'cp_badlands',
          [],
        );
        expect(gamesService.launch).toHaveBeenCalledWith('FAKE_GAME_ID');
        resolve();
      });
    });
  });

  describe('when there are impossible friendships', () => {
    beforeEach(() => {
      (
        FriendsService as jest.MockedClass<typeof FriendsService>
      ).mockImplementation(
        () =>
          ({
            friendships: [
              { sourcePlayerId: 'FAKE_MEDIC', targetPlayerId: 'FAKE_MEDIC' },
            ],
          } as FriendsService),
      );

      (
        QueueService as jest.MockedClass<typeof QueueService>
      ).mockImplementation(() => {
        const slots: QueueSlot[] = [
          {
            id: 0,
            playerId: 'FAKE_MEDIC',
            gameClass: Tf2ClassName.medic,
            ready: true,
            canMakeFriendsWith: [Tf2ClassName.soldier],
          },
          {
            id: 1,
            playerId: 'FAKE_MEDIC',
            gameClass: Tf2ClassName.medic,
            ready: true,
            canMakeFriendsWith: [Tf2ClassName.soldier],
          },
        ];

        return {
          slots,
          reset: jest.fn(),
          findSlotByPlayerId: jest
            .fn()
            .mockImplementation((playerId) =>
              slots.find((slot) => slot.playerId === playerId),
            ),
        } as unknown as QueueService;
      });
    });

    it('should remove impossible friendships', async () => {
      events.queueStateChange.next({ state: QueueState.launching });
      await flushPromises();
      expect(gamesService.create).toHaveBeenCalledWith(
        queueService.slots,
        'cp_badlands',
        [],
      );
    });
  });
});
