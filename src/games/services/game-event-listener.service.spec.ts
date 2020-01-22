import { Test, TestingModule } from '@nestjs/testing';
import { GameEventListenerService } from './game-event-listener.service';
import { Environment } from '@/environment/environment';
import { GameEventHandlerService } from './game-event-handler.service';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { GamesService } from './games.service';

class EnvironmentStub {
  logRelayAddress = '0.0.0.0';
  logRelayPort = '1234';
}

class GameEventHandlerServiceStub { }
class GameServersServiceStub { }
class GamesServiceStub { }

describe('GameEventListenerService', () => {
  let service: GameEventListenerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameEventListenerService,
        { provide: Environment, useClass: EnvironmentStub },
        { provide: GameEventHandlerService, useClass: GameEventHandlerServiceStub },
        { provide: GameServersService, useClass: GameServersServiceStub },
        { provide: GamesService, useClass: GamesServiceStub },
      ],
    }).compile();

    service = module.get<GameEventListenerService>(GameEventListenerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
