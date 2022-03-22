import { Test, TestingModule } from '@nestjs/testing';
import { StaticGameServersController } from './static-game-servers.controller';
import { GameServersService } from '../../../services/game-servers.service';
import { GameServerDiagnosticsService } from '../services/game-server-diagnostics.service';
import { Environment } from '@/environment/environment';
import { StaticGameServersService } from '../services/static-game-servers.service';
import { StaticGameServer } from '../models/static-game-server';
import { staticGameServerProviderName } from '../static-game-server-provider-name';

jest.mock('../services/game-server-diagnostics.service');
jest.mock('../services/static-game-servers.service');

describe('GameServers Controller', () => {
  let controller: StaticGameServersController;
  let gameServerDiagnosticsService: jest.Mocked<GameServerDiagnosticsService>;
  let environment: Partial<Environment>;
  let mockGameServer: jest.Mocked<StaticGameServer>;
  let mockStaticGameServersService: jest.Mocked<StaticGameServersService>;

  beforeEach(() => {
    environment = {
      apiUrl: 'FAKE_API_URL',
    };
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameServerDiagnosticsService,
        { provide: Environment, useValue: environment },
        StaticGameServersService,
      ],
      controllers: [StaticGameServersController],
    }).compile();

    controller = module.get<StaticGameServersController>(
      StaticGameServersController,
    );
    gameServerDiagnosticsService = module.get(GameServerDiagnosticsService);
    mockStaticGameServersService = module.get(StaticGameServersService);
  });

  beforeEach(() => {
    mockGameServer = {
      id: 'FAKE_GAME_SERVER_ID',
      provider: staticGameServerProviderName,
      createdAt: new Date(),
      name: 'FAKE_GAME_SERVER',
      address: 'localhost',
      port: '27015',
      rcon: jest.fn(),
      voiceChannelName: jest.fn(),
      getLogsecret: jest.fn(),
      internalIpAddress: 'localhost',
      rconPassword: 'FAKE_RCON_PASSWORD',
      isOnline: true,
      isClean: true,
      lastHeartbeatAt: new Date(),
      priority: 1,
      start: jest.fn().mockResolvedValue(mockGameServer),
    };
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('#getAllGameServers()', () => {
    beforeEach(() => {
      mockStaticGameServersService.getAllGameServers.mockResolvedValue([
        mockGameServer,
      ]);
    });

    it('should call service', async () => {
      const ret = await controller.getAllGameServers();
      expect(mockStaticGameServersService.getAllGameServers).toHaveBeenCalled();
      expect(ret).toEqual([mockGameServer]);
    });
  });

  describe('#gameServerHeartbeat()', () => {
    beforeEach(() => {
      mockStaticGameServersService.heartbeat.mockResolvedValue(mockGameServer);
    });

    describe('when the caller does not provide its own internal IP address', () => {
      it('should use automatically-recognized IP address', async () => {
        const ret = await controller.gameServerHeartbeat(
          {
            name: 'FAKE_GAMESERVER_NAME',
            address: 'FAKE_GAMESERVER_ADDRESS',
            port: '27015',
            rconPassword: 'FAKE_RCON_PASSWORD',
          },
          'FAKE_INTERNAL_ADDRESS',
        );
        expect(mockStaticGameServersService.heartbeat).toHaveBeenCalledWith({
          name: 'FAKE_GAMESERVER_NAME',
          address: 'FAKE_GAMESERVER_ADDRESS',
          port: '27015',
          rconPassword: 'FAKE_RCON_PASSWORD',
          internalIpAddress: 'FAKE_INTERNAL_ADDRESS',
        });
        expect(ret).toEqual(mockGameServer);
      });
    });

    describe('when the caller specifies its own internal IP address', () => {
      it('should use the provided address', async () => {
        const ret = await controller.gameServerHeartbeat(
          {
            name: 'FAKE_GAMESERVER_NAME',
            address: 'FAKE_GAMESERVER_ADDRESS',
            port: '27015',
            rconPassword: 'FAKE_RCON_PASSWORD',
            internalIpAddress: 'FAKE_GAMESERVER_ADDRESS',
          },
          'FAKE_INTERNAL_ADDRESS',
        );
        expect(mockStaticGameServersService.heartbeat).toHaveBeenCalledWith({
          name: 'FAKE_GAMESERVER_NAME',
          address: 'FAKE_GAMESERVER_ADDRESS',
          port: '27015',
          rconPassword: 'FAKE_RCON_PASSWORD',
          internalIpAddress: 'FAKE_GAMESERVER_ADDRESS',
        });
        expect(ret).toEqual(mockGameServer);
      });
    });
  });

  describe('#runDiagnostics()', () => {
    beforeEach(() => {
      gameServerDiagnosticsService.runDiagnostics.mockResolvedValue(
        'FAKE_DIAGNOSTICS_ID',
      );
    });

    it('should call the service', async () => {
      const ret = await controller.runDiagnostics('FAKE_GAME_SERVER_ID');
      expect(gameServerDiagnosticsService.runDiagnostics).toHaveBeenCalledWith(
        'FAKE_GAME_SERVER_ID',
      );
      expect(ret).toEqual({
        diagnosticRunId: 'FAKE_DIAGNOSTICS_ID',
        tracking: {
          url: 'FAKE_API_URL/game-server-diagnostics/FAKE_DIAGNOSTICS_ID',
        },
      });
    });
  });
});
