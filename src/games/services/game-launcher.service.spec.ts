import { Test, TestingModule } from '@nestjs/testing';
import { GameLauncherService } from './game-launcher.service';
import { GamesService } from './games.service';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { ServerConfiguratorService } from './server-configurator.service';
import { Events } from '@/events/events';
import { GameServerDocument } from '@/game-servers/models/game-server';
import { ConfigurationService } from '@/configuration/services/configuration.service';

jest.mock('@/game-servers/services/game-servers.service');
jest.mock('@/configuration/services/configuration.service');

const mockGame = {
  id: 'FAKE_GAME_ID',
  _id: 'FAKE_GAME_ID',
  number: 2,
  state: 'launching',
  gameServer: null,
  save: () => Promise.resolve(),
  toJSON: () => this,
};

class GamesServiceStub {
  getById() {
    return new Promise((resolve) => resolve(mockGame));
  }
  getOrphanedGames() {
    return new Promise((resolve) => resolve([mockGame]));
  }
}

const mockGameServer = {
  id: 'FAKE_GAME_SERVER_ID',
  _id: 'FAKE_GAME_SERVER_ID',
  name: 'FAKE_GAME_SERVER',
  mumbleChannelName: 'FAKE_SERVER_MUMBLE_CHANNEL_NAME',
  game: undefined,
  save: () => null,
};

class ServerConfiguratorServiceStub {
  configureServer(server: any, game: any) {
    return new Promise((resolve) =>
      resolve({
        connectString: 'FAKE_CONNECT_STRING',
        stvConnectString: 'FAKE_STV_CONNECT_STRING',
      }),
    );
  }
}

describe('GameLauncherService', () => {
  let service: GameLauncherService;
  let gamesService: GamesServiceStub;
  let gameServersService: jest.Mocked<GameServersService>;
  let serverConfiguratorService: ServerConfiguratorServiceStub;
  let configurationService: jest.Mocked<ConfigurationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameLauncherService,
        { provide: GamesService, useClass: GamesServiceStub },
        GameServersService,
        {
          provide: ServerConfiguratorService,
          useClass: ServerConfiguratorServiceStub,
        },
        Events,
        ConfigurationService,
      ],
    }).compile();

    service = module.get<GameLauncherService>(GameLauncherService);
    gamesService = module.get(GamesService);
    gameServersService = module.get(GameServersService);
    serverConfiguratorService = module.get(ServerConfiguratorService);
    configurationService = module.get(ConfigurationService);
  });

  beforeEach(() => {
    gameServersService.assignFreeGameServer.mockResolvedValue(
      mockGameServer as GameServerDocument,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#launch()', () => {
    beforeEach(() => {
      configurationService.getVoiceServer.mockResolvedValue({
        type: 'mumble',
        url: 'mumble.melkor.tf',
        port: 64738,
        channelName: 'tf2pickuppl',
      });
    });

    describe('when the game does not exist', () => {
      beforeEach(() => {
        jest.spyOn(gamesService, 'getById').mockResolvedValue(null);
      });

      it('should throw', async () => {
        await expect(service.launch('FAKE_GAME_ID')).rejects.toThrowError(
          'no such game',
        );
      });
    });

    it('should configure the game server', async () => {
      const spy = jest.spyOn(serverConfiguratorService, 'configureServer');
      const ret = await service.launch('FAKE_GAME_ID');
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ id: mockGameServer.id }),
        expect.objectContaining({ id: mockGame.id }),
      );
      expect(ret.connectString).toEqual('FAKE_CONNECT_STRING');
      expect(ret.stvConnectString).toEqual('FAKE_STV_CONNECT_STRING');
    });

    it('should setup a valid mumble url', async () => {
      const ret = await service.launch('FAKE_GAME_ID');
      expect(ret.mumbleUrl).toEqual(
        'mumble://mumble.melkor.tf:64738/tf2pickuppl/FAKE_SERVER_MUMBLE_CHANNEL_NAME',
      );
    });
  });

  describe('#launchOrphanedGames()', () => {
    it('should launch orphaned games', async () => {
      const spy = jest.spyOn(service, 'launch');
      await service.launchOrphanedGames();
      expect(spy).toHaveBeenCalledWith('FAKE_GAME_ID');
    });
  });
});
