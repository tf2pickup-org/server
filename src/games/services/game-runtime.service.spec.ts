import { Test, TestingModule } from '@nestjs/testing';
import { GameRuntimeService } from './game-runtime.service';
import { GamesService } from './games.service';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { ServerConfiguratorService } from './server-configurator.service';
import { RconFactoryService } from './rcon-factory.service';
import { PlayersService } from '@/players/services/players.service';

const mockGame = {
  id: 'FAKE_GAME_ID',
  number: 2,
  state: 'launching',
  gameServer: 'FAKE_GAME_SERVER_ID',
  save: () => null,
};

class GamesServiceStub {
  getById(id: string) { return new Promise(resolve => resolve(mockGame)); }
}

const mockGameServer = {
  id: 'FAKE_GAME_SERVER_ID',
  name: 'FAKE_GAME_SERVER',
};

class GameServersServiceStub {
  getById(id: string) { return new Promise(resolve => resolve(mockGameServer)); }
  releaseServer(id: string) { return null; }
}

class ServerConfiguratorServiceStub {
  configureServer(server: any, game: any) { return new Promise(resolve => resolve({ connectString: 'FAKE_CONNECT_STRING' })); }
  cleanupServer(server: any) { return null; }
}

class RconFactoryServiceStub { }
class PlayersServiceStub { }

describe('GameRuntimeService', () => {
  let service: GameRuntimeService;
  let gamesService: GamesServiceStub;
  let gameServersService: GameServersServiceStub;
  let serverConfiguratorService: ServerConfiguratorServiceStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameRuntimeService,
        { provide: GamesService, useClass: GamesServiceStub },
        { provide: GameServersService, useClass: GameServersServiceStub },
        { provide: ServerConfiguratorService, useClass: ServerConfiguratorServiceStub },
        { provide: RconFactoryService, useClass: RconFactoryServiceStub },
        { provide: PlayersService, useClass: PlayersServiceStub },
      ],
    }).compile();

    service = module.get<GameRuntimeService>(GameRuntimeService);
    gamesService = module.get(GamesService);
    gameServersService = module.get(GameServersService);
    serverConfiguratorService = module.get(ServerConfiguratorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#reconfigure()', () => {
    it('should configure the server again', async () => {
      const spy = spyOn(serverConfiguratorService, 'configureServer').and.callThrough();
      const ret = await service.reconfigure('FAKE_GAME_ID');
      expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({ id: mockGameServer.id }), jasmine.objectContaining({ id: mockGame.id }));
      expect(ret.connectString).toEqual('FAKE_CONNECT_STRING');
    });

    it('should throw an error if the given game does not exist', async () => {
      spyOn(gamesService, 'getById').and.returnValue(null);
      await expectAsync(service.reconfigure('FAKE_GAME_ID')).toBeRejectedWithError('no such game');
    });

    it('should throw an error if the game has no game server assigned', async () => {
      const retGame = { ...mockGame, gameServer: null };
      spyOn(gamesService, 'getById').and.returnValue(retGame as any);
      await expectAsync(service.reconfigure('FAKE_GAME_ID')).toBeRejectedWithError('this game has no server assigned');
    });
  });

  describe('#forceEnd()', () => {
    it('should set the game state', async () => {
      const ret = await service.forceEnd('FAKE_GAME_ID');
      expect(ret.state).toEqual('interrupted');
      expect(ret.error).toEqual('ended by admin');
    });

    it('should clean up the game server', async () => {
      const cleanupSpy = spyOn(serverConfiguratorService, 'cleanupServer');
      const releaseSpy = spyOn(gameServersService, 'releaseServer');
      await service.forceEnd('FAKE_GAME_ID');
      expect(cleanupSpy).toHaveBeenCalledWith(mockGameServer);
      expect(releaseSpy).toHaveBeenCalledWith('FAKE_GAME_SERVER_ID');
    });

    it('should throw an error if the given game does not exist', async () => {
      spyOn(gamesService, 'getById').and.returnValue(null);
      await expectAsync(service.forceEnd('FAKE_GAME_ID')).toBeRejectedWithError('no such game');
    });
  });

  describe('#replacePlayer()', () => {
    it('should execute the correct commands');

    it('should throw an error if the given game does not exist', async () => {
      spyOn(gamesService, 'getById').and.returnValue(null);
      await expectAsync(service.replacePlayer('FAKE_GAME_ID', 'FAKE_REPLACEE_ID', null)).toBeRejectedWithError('no such game');
    });
  });
});
