import { Test, TestingModule } from '@nestjs/testing';
import { GameRunnerFactoryService } from './game-runner-factory.service';
import { GamesService } from './games.service';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { ConfigService } from '@/config/config.service';
import { ServerConfiguratorService } from './server-configurator.service';
import { PlayersService } from '@/players/services/players.service';

class GamesServiceStub { }

class GameServersServiceStub { }

class ConfigServiceStub { }

class ServerConfiguratorServiceStub { }

class PlayersServiceStub { }

describe('GameRunnerFactoryService', () => {
  let service: GameRunnerFactoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameRunnerFactoryService,
        { provide: GamesService, useClass: GamesServiceStub },
        { provide: GameServersService, useClass: GameServersServiceStub },
        { provide: ConfigService, useClass: ConfigServiceStub },
        { provide: ServerConfiguratorService, useClass: ServerConfiguratorServiceStub },
        { provide: PlayersService, useClass: PlayersServiceStub },
      ],
    }).compile();

    service = module.get<GameRunnerFactoryService>(GameRunnerFactoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
