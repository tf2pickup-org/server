import { Test, TestingModule } from '@nestjs/testing';
import { GameRuntimeService } from './game-runtime.service';
import { GamesService } from './games.service';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { ServerConfiguratorService } from './server-configurator.service';
import { RconFactoryService } from './rcon-factory.service';
import { PlayersService } from '@/players/services/players.service';
import { GamesGateway } from '../gateways/games.gateway';

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

class RconStub {
  send(cmd: string) { return new Promise(resolve => resolve()); }
  end() { return new Promise(resolve => resolve()); }
}

class RconFactoryServiceStub {
  createRcon(gameServer: any) { return new Promise(resolve => resolve(new RconStub())); }
}

class PlayersServiceStub {
  getById(id: string) { return new Promise(resolve => resolve({ steamId: 'FAKE_STEAM_ID', name: 'A_PLAYER' })); }
}

class GamesGatewayStub {
  emitGameUpdated(game: any) { return null; }
}

describe('GameRuntimeService', () => {
  let service: GameRuntimeService;
  let gamesService: GamesServiceStub;
  let gameServersService: GameServersServiceStub;
  let serverConfiguratorService: ServerConfiguratorServiceStub;
  let rconFactoryService: RconFactoryServiceStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameRuntimeService,
        { provide: GamesService, useClass: GamesServiceStub },
        { provide: GameServersService, useClass: GameServersServiceStub },
        { provide: ServerConfiguratorService, useClass: ServerConfiguratorServiceStub },
        { provide: RconFactoryService, useClass: RconFactoryServiceStub },
        { provide: PlayersService, useClass: PlayersServiceStub },
        { provide: GamesGateway, useClass: GamesGatewayStub },
        { provide: RconFactoryService, useClass: RconFactoryServiceStub },
      ],
    }).compile();

    service = module.get<GameRuntimeService>(GameRuntimeService);
    gamesService = module.get(GamesService);
    gameServersService = module.get(GameServersService);
    serverConfiguratorService = module.get(ServerConfiguratorService);
    rconFactoryService = module.get(RconFactoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#reconfigure()', () => {
    it('should configure the server again', async () => {
      const spy = jest.spyOn(serverConfiguratorService, 'configureServer');
      const ret = await service.reconfigure('FAKE_GAME_ID');
      expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({ id: mockGameServer.id }), jasmine.objectContaining({ id: mockGame.id }));
      expect(ret.connectString).toEqual('FAKE_CONNECT_STRING');
    });

    it('should throw an error if the given game does not exist', async () => {
      jest.spyOn(gamesService, 'getById').mockResolvedValue(null);
      await expect(service.reconfigure('FAKE_GAME_ID')).rejects.toThrowError('no such game');
    });

    it('should throw an error if the game has no game server assigned', async () => {
      const retGame = { ...mockGame, gameServer: null };
      jest.spyOn(gamesService, 'getById').mockResolvedValue(retGame);
      await expect(service.reconfigure('FAKE_GAME_ID')).rejects.toThrowError('this game has no server assigned');
    });

    it('should handle RCON errors', async () => {
      jest.spyOn(serverConfiguratorService, 'configureServer').mockRejectedValue('something something');;
      await expect(service.reconfigure('FAKE_GAME_ID')).resolves.toBeTruthy();
    });
  });

  describe('#forceEnd()', () => {
    it('should set the game state', async () => {
      const ret = await service.forceEnd('FAKE_GAME_ID');
      expect(ret.state).toEqual('interrupted');
      expect(ret.error).toEqual('ended by admin');
    });

    it('should clean up the game server', async () => {
      const cleanupSpy = jest.spyOn(serverConfiguratorService, 'cleanupServer');
      const releaseSpy = jest.spyOn(gameServersService, 'releaseServer');
      await service.forceEnd('FAKE_GAME_ID');
      expect(cleanupSpy).toHaveBeenCalledWith(mockGameServer);
      expect(releaseSpy).toHaveBeenCalledWith('FAKE_GAME_SERVER_ID');
    });

    it('should throw an error if the given game does not exist', async () => {
      jest.spyOn(gamesService, 'getById').mockResolvedValue(null);
      await expect(service.forceEnd('FAKE_GAME_ID')).rejects.toThrowError('no such game');
    });

    it('should handle RCON erors', async () => {
      jest.spyOn(serverConfiguratorService, 'cleanupServer').mockRejectedValue('error');
      await expect(service.forceEnd('FAKE_GAME_ID')).resolves.toBeTruthy();
    });
  });

  describe('#replacePlayer()', () => {
    it.todo('should execute the correct commands');

    it('should throw an error if the given game does not exist', async () => {
      jest.spyOn(gamesService, 'getById').mockResolvedValue(null);
      await expect(service.replacePlayer('FAKE_GAME_ID', 'FAKE_REPLACEE_ID', null)).rejects.toThrowError('no such game');
    });

    it('should throw an error if the game has no game server assigned', async () => {
      jest.spyOn(gamesService, 'getById').mockResolvedValue({ ...mockGame, gameServer: null });
      await expect(service.replacePlayer('FAKE_GAME_ID', 'FAKE_REPLACEE_ID', null)).rejects.toThrowError('this game has no server assigned');
    });

    it('should close the RCON connection', async () => {
      const rcon = new RconStub();
      jest.spyOn(rconFactoryService, 'createRcon').mockResolvedValue(rcon);
      const spy = spyOn(rcon, 'end');

      await service.replacePlayer('FAKE_GAME_ID', 'FAKE_REPLACEE_ID', { playerId: 'FAKE_PLAYER_ID', teamId: '0', gameClass: 'soldier' });
      expect(spy).toHaveBeenCalled();
    });
  });
});
