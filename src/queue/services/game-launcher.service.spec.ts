import { Test, TestingModule } from '@nestjs/testing';
import { GameLauncherService } from './game-launcher.service';
import { QueueService } from './queue.service';
import { Subject } from 'rxjs';
import { MapVoteService } from './map-vote.service';
import { GamesService } from '@/games/services/games.service';

class QueueServiceStub {
  stateChange = new Subject<string>();
  slots = [ { id: 0, player: 'FAKE_PLAYER_ID_1' }, { id: 1, player: 'FAKE_PLAYER_ID_2' } ];
  reset() { return null; }
}

class MapVoteServiceStub {
  getWinner() { return 'cp_badlands'; }
}

class GamesServiceStub {
  create(slots: any[], map: string) { return { id: 'FAKE_GAME_ID' }; }
  launch(gameId: string) { return new Promise(resolve => resolve()); }
}

describe('GameLauncherService', () => {
  let service: GameLauncherService;
  let queueService: QueueServiceStub;
  let gamesService: GamesServiceStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameLauncherService,
        { provide: QueueService, useClass: QueueServiceStub },
        { provide: MapVoteService, useClass: MapVoteServiceStub },
        { provide: GamesService, useClass: GamesServiceStub },
      ],
    }).compile();

    service = module.get<GameLauncherService>(GameLauncherService);
    queueService = module.get(QueueService);
    gamesService = module.get(GamesService);

    service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should launch the game and reset the queue', async () => {
    const resetSpy = spyOn(queueService, 'reset');
    const createSpy = spyOn(gamesService, 'create').and.callThrough();
    const launchSpy = spyOn(gamesService, 'launch').and.callThrough();
    queueService.stateChange.next('launching');

    setImmediate(() => {
      expect(resetSpy).toHaveBeenCalled();
      expect(createSpy).toHaveBeenCalledWith(queueService.slots, 'cp_badlands');
      expect(launchSpy).toHaveBeenCalledWith('FAKE_GAME_ID');
    });
  });
});
