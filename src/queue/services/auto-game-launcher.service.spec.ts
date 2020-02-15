import { Test, TestingModule } from '@nestjs/testing';
import { AutoGameLauncherService } from './auto-game-launcher.service';
import { Subject } from 'rxjs';
import { QueueService } from './queue.service';
import { MapVoteService } from './map-vote.service';
import { GamesService } from '@/games/services/games.service';
import { FriendsService } from './friends.service';

class QueueServiceStub {
  stateChange = new Subject<string>();
  slots = [ { id: 0, player: 'FAKE_PLAYER_ID_1' }, { id: 1, player: 'FAKE_PLAYER_ID_2' } ];
  reset() { return null; }
}

class MapVoteServiceStub {
  getWinner() { return 'cp_badlands'; }
}

class GamesServiceStub {
  create(slots: any[], map: string, friends: string[][]) { return { id: 'FAKE_GAME_ID' }; }
  launch(gameId: string) { return new Promise(resolve => resolve()); }
}

class FriendsServiceStub {
  friendships = [{ sourcePlayerId: 'FAKE_MEDIC', targetPlayerId: 'FAKE_DM_CLASS' }];
}

describe('AutoGameLauncherService', () => {
  let service: AutoGameLauncherService;
  let queueService: QueueServiceStub;
  let gamesService: GamesServiceStub;
  let friendsService: FriendsServiceStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutoGameLauncherService,
        { provide: QueueService, useClass: QueueServiceStub },
        { provide: MapVoteService, useClass: MapVoteServiceStub },
        { provide: GamesService, useClass: GamesServiceStub },
        { provide: FriendsService, useClass: FriendsServiceStub },
      ],
    }).compile();

    service = module.get<AutoGameLauncherService>(AutoGameLauncherService);
    queueService = module.get(QueueService);
    gamesService = module.get(GamesService);
    friendsService = module.get(FriendsService);
  });

  beforeEach(() => service.onModuleInit());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should launch the game and reset the queue', async done => {
    const resetSpy = jest.spyOn(queueService, 'reset');
    const createSpy = jest.spyOn(gamesService, 'create');
    const launchSpy = jest.spyOn(gamesService, 'launch');
    queueService.stateChange.next('launching');

    setImmediate(() => {
      expect(resetSpy).toHaveBeenCalled();
      expect(createSpy).toHaveBeenCalledWith(queueService.slots, 'cp_badlands', [['FAKE_MEDIC', 'FAKE_DM_CLASS']]);
      expect(launchSpy).toHaveBeenCalledWith('FAKE_GAME_ID');
      done();
    });
  });
});
