import { Environment } from '@/environment/environment';
import { Test, TestingModule } from '@nestjs/testing';
import { plainToClass } from 'class-transformer';
import { GameServer } from '../models/game-server';
import { GameServerDiagnosticsService } from '../providers/static-game-server/services/game-server-diagnostics.service';
import { StaticGameServersService } from '../providers/static-game-server/services/static-game-servers.service';
import { GameServersService } from '../services/game-servers.service';
import { GameServersController } from './game-servers.controller';

jest.mock('../services/game-servers.service');
jest.mock(
  '../providers/static-game-server/services/static-game-servers.service',
);
jest.mock(
  '../providers/static-game-server/services/game-server-diagnostics.service',
);
jest.mock('@/environment/environment');

describe('GameServersController', () => {
  let controller: GameServersController;
  let gameServersService: jest.Mocked<GameServersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GameServersController],
      providers: [
        GameServersService,
        StaticGameServersService,
        GameServerDiagnosticsService,
        Environment,
      ],
    }).compile();

    controller = module.get<GameServersController>(GameServersController);
    gameServersService = module.get(GameServersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('#getGameServer()', () => {
    let mockGameServer: GameServer;

    beforeEach(() => {
      mockGameServer = plainToClass(GameServer, {
        id: 'FAKE_GAME_SERVER_ID',
        provider: 'test',
        createdAt: new Date(),
        name: 'FAKE_GAME_SERVER',
        address: 'localhost',
        port: '27015',
      });
      gameServersService.getById.mockResolvedValue(mockGameServer);
    });

    it('should return the game server', async () => {
      const ret = await controller.getGameServer('FAKE_GAME_SERVER_ID');
      expect(gameServersService.getById).toHaveBeenCalledWith(
        'FAKE_GAME_SERVER_ID',
      );
      expect(ret).toEqual(mockGameServer);
    });
  });
});
