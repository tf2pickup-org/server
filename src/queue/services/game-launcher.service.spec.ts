import { Test, TestingModule } from '@nestjs/testing';
import { GameLauncherService } from './game-launcher.service';
import { QueueService } from './queue.service';
import { Subject } from 'rxjs';

class QueueServiceStub {
  state = new Subject<string>();
  reset() { }
}

describe('GameLauncherService', () => {
  let service: GameLauncherService;
  let queueService: QueueServiceStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameLauncherService,
        { provide: QueueService, useClass: QueueServiceStub },
      ],
    }).compile();

    service = module.get<GameLauncherService>(GameLauncherService);
    queueService = module.get(QueueService);

    service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should eventually reset the queue', () => {
    const spy = spyOn(queueService, 'reset');
    queueService.state.next('launching');
    expect(spy).toHaveBeenCalled();
  });
});
