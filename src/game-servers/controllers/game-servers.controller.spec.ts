import { Test, TestingModule } from '@nestjs/testing';
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

  describe('#getGameServerOptions()', () => {
    beforeEach(() => {
      gameServersService.findAllGameServerOptions.mockResolvedValue([
        {
          id: 'FAKE_GAMESERVER_ID',
          name: 'FAKE GAMESERVER',
          provider: 'fake',
        },
      ]);
    });

    it('should return game server options', async () => {
      const result = await controller.getGameServerOptions();
      expect(result).toEqual([
        {
          id: 'FAKE_GAMESERVER_ID',
          name: 'FAKE GAMESERVER',
          provider: 'fake',
        },
      ]);
    });
  });
});
