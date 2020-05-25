import { Test, TestingModule } from '@nestjs/testing';
import { GameLauncherService } from './game-launcher.service';
import { GamesService } from './games.service';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { ServerConfiguratorService } from './server-configurator.service';
import { Environment } from '@/environment/environment';
import { GamesGateway } from '../gateways/games.gateway';
import { ObjectId } from 'mongodb';

jest.mock('./games.service');
jest.mock('@/game-servers/services/game-servers.service');
jest.mock('./server-configurator.service');
jest.mock('../gateways/games.gateway');

const mockGame = {
  id: new ObjectId(),
  number: 2,
  state: 'launching',
  gameServer: null,
  save: () => null,
};

const mockGameServer = {
  id: new ObjectId(),
  name: 'FAKE_GAME_SERVER',
  mumbleChannelName: 'FAKE_SERVER_MUMBLE_CHANNEL_NAME',
};

class EnvironmentStub {
  mumbleServerUrl = 'FAKE_MUMBLE_SERVER_URL';
  mumbleChannelName = 'FAKE_MUMBLE_CHANNEL_NAME';
}

describe('GameLauncherService', () => {
  let service: GameLauncherService;
  let gamesService: GamesService;
  let gameServersService: GameServersService;
  let serverConfiguratorService: ServerConfiguratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameLauncherService,
        GamesService,
        GameServersService,
        ServerConfiguratorService,
        { provide: Environment, useClass: EnvironmentStub },
        GamesGateway,
      ],
    }).compile();

    service = module.get<GameLauncherService>(GameLauncherService);
    gamesService = module.get(GamesService);
    gameServersService = module.get(GameServersService);
    serverConfiguratorService = module.get(ServerConfiguratorService);
  });

  beforeEach(() => {
    // @ts-expect-error
    gamesService.getById = () => Promise.resolve(mockGame);

    serverConfiguratorService.configureServer = () => Promise.resolve({
      connectString: 'FAKE_CONNECT_STRING',
      stvConnectString: 'FAKE_STV_CONNECT_STRING',
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#launch()', () => {
    describe('when the given game does not exist', () => {
      beforeEach(() => {
        gamesService.getById = () => Promise.resolve(null);
      });

      it('should reject', async () => {
        await expect(service.launch(mockGame.id)).rejects.toThrowError('no such game');
      });
    });

    describe('when there is a free game server', () => {
      beforeEach(() => {
        // @ts-expect-error
        gameServersService.findFreeGameServer = () => Promise.resolve(mockGameServer);
      });

      it('should take the game server', async () => {
        const spy = jest.spyOn(gameServersService, 'takeServer');
        const ret = await service.launch(mockGame.id);
        expect(spy).toHaveBeenCalledWith(mockGameServer.id);
        expect(ret.gameServer).toEqual(mockGameServer);
      });

      it('should configure the game server', async () => {
        const spy = jest.spyOn(serverConfiguratorService, 'configureServer');
        const ret = await service.launch(mockGame.id);
        expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: mockGameServer.id }), expect.objectContaining({ id: mockGame.id }));
        expect(ret.connectString).toEqual('FAKE_CONNECT_STRING');
        expect(ret.stvConnectString).toEqual('FAKE_STV_CONNECT_STRING');
      });

      it('should setup a valid mumble url', async () => {
        const ret = await service.launch(mockGame.id);
        expect(ret.mumbleUrl).toEqual('mumble://FAKE_MUMBLE_SERVER_URL/FAKE_MUMBLE_CHANNEL_NAME/FAKE_SERVER_MUMBLE_CHANNEL_NAME');
      });
    });
  });

  describe('#launchOrphanedGames()', () => {
    describe('with orphaned games', () => {
      beforeEach(() => {
        // @ts-expect-error
        gamesService.getOrphanedGames = () => Promise.resolve([ mockGame ]);
      });

      it('should launch orphaned games', async () => {
        const spy = jest.spyOn(service, 'launch');
        await service.launchOrphanedGames();
        expect(spy).toHaveBeenCalledWith(mockGame.id);
      });
    });
  });
});
