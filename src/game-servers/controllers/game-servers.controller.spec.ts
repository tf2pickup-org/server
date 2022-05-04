import { Test, TestingModule } from '@nestjs/testing';
import { plainToClass } from 'class-transformer';
import { GameServer } from '../models/game-server';
import { GameServersService } from '../services/game-servers.service';
import { GameServersController } from './game-servers.controller';

jest.mock('../services/game-servers.service');

describe('GameServersController', () => {
  let controller: GameServersController;
  let gameServersService: jest.Mocked<GameServersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GameServersController],
      providers: [GameServersService],
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
