import { Test, TestingModule } from '@nestjs/testing';
import { GameRunnerManagerService } from './game-runner-manager.service';
import { GameRunnerFactoryService } from './game-runner-factory.service';
import { Subject } from 'rxjs';

class GameRunnerStub {
  constructor(public gameId: string) { }
  gameInitialized = new Subject<void>();
  gameFinished = new Subject<void>();
  gameServer = null;
}

class GameRunnerFactoryServiceStub {
  createGameRunner(gameId: string) { return new GameRunnerStub(gameId); }
}

describe('GameRunnerManagerService', () => {
  let service: GameRunnerManagerService;
  let gameRunnerFactoryService: GameRunnerFactoryServiceStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameRunnerManagerService,
        { provide: GameRunnerFactoryService, useClass: GameRunnerFactoryServiceStub },
      ],
    }).compile();

    service = module.get<GameRunnerManagerService>(GameRunnerManagerService);
    gameRunnerFactoryService = module.get(GameRunnerFactoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#createGameRunner()', () => {
    it('should create and register a new GameRunner instance', () => {
      const spy = spyOn(gameRunnerFactoryService, 'createGameRunner').and.callThrough();
      const ret = service.createGameRunner('FAKE_ID');
      expect(spy).toHaveBeenCalledWith('FAKE_ID');
      expect(service.runners.includes(ret)).toBe(true);
    });

    it('should register and unregister the game runner', () => {
      const ret = service.createGameRunner('FAKE_ID') as unknown as GameRunnerStub;
      ret.gameServer = {
        port: '1234',
        resolvedIpAddresses: [ '127.0.0.1', '192.168.1.1' ],
      };
      ret.gameInitialized.next();

      expect(service.findGameRunnerByEventSource('127.0.0.1:1234') === (ret as any)).toBe(true);
      expect(service.findGameRunnerByEventSource('192.168.1.1:1234') === (ret as any)).toBe(true);
      expect(service.findGameRunnerByEventSource('192.168.1.1:27015')).toBeFalsy();

      ret.gameFinished.next();

      expect(service.runners.includes(ret as any)).toBe(false);
      expect(service.findGameRunnerByEventSource('127.0.0.1:1234')).toBeFalsy();
      expect(service.findGameRunnerByEventSource('192.168.1.1:1234')).toBeFalsy();
    });
  });
});
