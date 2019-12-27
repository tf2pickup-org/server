import { Test, TestingModule } from '@nestjs/testing';
import { GameEventListenerService } from './game-event-listener.service';
import { ConfigService } from '@/config/config.service';
import { GameServersService } from './game-servers.service';

class ConfigServiceStub {
  logRelayAddress = '0.0.0.0';
  logRelayPort = '1234';
}

class GameServersServiceStub {

}

describe('GameEventListenerService', () => {
  let service: GameEventListenerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameEventListenerService,
        { provide: ConfigService, useClass: ConfigServiceStub },
        { provide: GameServersService, useClass: GameServersServiceStub },
      ],
    }).compile();

    service = module.get<GameEventListenerService>(GameEventListenerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
