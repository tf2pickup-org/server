import { Test, TestingModule } from '@nestjs/testing';
import { GameRunnerFactoryService } from './game-runner-factory.service';
import { GamesService } from './games.service';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { ServerConfiguratorService } from './server-configurator.service';
import { PlayersService } from '@/players/services/players.service';
import { Environment } from '@/environment/environment';
import { RconFactoryService } from './rcon-factory.service';

class GamesServiceStub { }

class GameServersServiceStub { }

class EnvironmentStub { }

class ServerConfiguratorServiceStub { }

class PlayersServiceStub { }

class RconFactoryServiceStub { }

describe('GameRunnerFactoryService', () => {
  let service: GameRunnerFactoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameRunnerFactoryService,
        { provide: GamesService, useClass: GamesServiceStub },
        { provide: GameServersService, useClass: GameServersServiceStub },
        { provide: Environment, useClass: EnvironmentStub },
        { provide: ServerConfiguratorService, useClass: ServerConfiguratorServiceStub },
        { provide: PlayersService, useClass: PlayersServiceStub },
        { provide: RconFactoryService, useClass: RconFactoryServiceStub },
      ],
    }).compile();

    service = module.get<GameRunnerFactoryService>(GameRunnerFactoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
