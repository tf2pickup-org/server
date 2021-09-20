import { Test, TestingModule } from '@nestjs/testing';
import { GameServersController } from './game-servers.controller';
import { GameServersService } from '../services/game-servers.service';
import { GameServer } from '../models/game-server';
import { GameServerDiagnosticsService } from '../services/game-server-diagnostics.service';
import { Environment } from '@/environment/environment';
import { Player } from '@/players/models/player';

const mockGameServer: GameServer = {
  name: 'FAKE_NAME',
  address: 'FAKE_ADDRESS',
  port: '27015',
  rconPassword: 'FAKE_RCON_PASSWORD',
  internalIpAddress: 'FAKE_INTERNAL_IP_ADDRESS',
  id: 'FAKE_GAME_SERVER_ID',
  createdAt: new Date(),
  isAvailable: true,
  isOnline: true,
};

jest.mock('../services/game-servers.service');
jest.mock('../services/game-server-diagnostics.service');

describe('GameServers Controller', () => {
  let controller: GameServersController;
  let gameServersService: jest.Mocked<GameServersService>;
  let gameServerDiagnosticsService: jest.Mocked<GameServerDiagnosticsService>;
  let environment: Partial<Environment>;

  beforeEach(() => {
    environment = {
      apiUrl: 'FAKE_API_URL',
    };
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameServersService,
        GameServerDiagnosticsService,
        { provide: Environment, useValue: environment },
      ],
      controllers: [GameServersController],
    }).compile();

    controller = module.get<GameServersController>(GameServersController);
    gameServersService = module.get(GameServersService);
    gameServerDiagnosticsService = module.get(GameServerDiagnosticsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('#getAllGameServers()', () => {
    beforeEach(() => {
      gameServersService.getAllGameServers.mockResolvedValue([mockGameServer]);
    });

    it('should call service', async () => {
      const ret = await controller.getAllGameServers();
      expect(gameServersService.getAllGameServers).toHaveBeenCalled();
      expect(ret).toEqual([mockGameServer]);
    });
  });

  describe('#getGameServer()', () => {
    beforeEach(() => {
      gameServersService.getById.mockResolvedValue(mockGameServer);
    });

    it('should return the game server', async () => {
      const ret = await controller.getGameServer('FAKE_ID');
      expect(gameServersService.getById).toHaveBeenCalledWith('FAKE_ID');
      expect(ret).toEqual(mockGameServer);
    });
  });

  describe('#removeGameServer()', () => {
    beforeEach(() => {
      gameServersService.removeGameServer.mockResolvedValue(mockGameServer);
    });

    it('should call the service', async () => {
      await controller.removeGameServer('FAKE_ID', {
        id: 'FAKE_ADMIN_ID',
      } as Player);
      expect(gameServersService.removeGameServer).toHaveBeenCalledWith(
        'FAKE_ID',
        'FAKE_ADMIN_ID',
      );
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
