import { Test, TestingModule } from '@nestjs/testing';
import { GameEventListenerService } from './game-event-listener.service';
import { Environment } from '@/environment/environment';
import { GameRunnerManagerService } from './game-runner-manager.service';

class EnvironmentStub {
  logRelayAddress = '0.0.0.0';
  logRelayPort = '1234';
}

class GameRunnerManagerServiceStub {

}

describe('GameEventListenerService', () => {
  let service: GameEventListenerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameEventListenerService,
        { provide: Environment, useClass: EnvironmentStub },
        { provide: GameRunnerManagerService, useClass: GameRunnerManagerServiceStub },
      ],
    }).compile();

    service = module.get<GameEventListenerService>(GameEventListenerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
