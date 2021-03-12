import { Test, TestingModule } from '@nestjs/testing';
import { GameServersController } from './game-servers.controller';
import { GameServersService } from '../services/game-servers.service';
import { GameServer } from '../models/game-server';
import { NotFoundException } from '@nestjs/common';

// class GameServersServiceStub {


//   async getAllGameServers() { return new Promise(resolve => resolve([ this.gameServer ])); }
//   async getById(id: string) { return new Promise(resolve => resolve(this.gameServer)); }
//   async addGameServer(gameServer: any) { return new Promise(resolve => resolve(gameServer)); }
//   async removeGameServer(id: string) { return new  Promise(resolve => resolve()); }
// }

const mockGameServer: GameServer = {
  name: 'FAKE_NAME',
  address: 'FAKE_ADDRESS',
  port: '27015',
  rconPassword: 'FAKE_RCON_PASSWORD',
};

jest.mock('../services/game-servers.service');

describe('GameServers Controller', () => {
  let controller: GameServersController;
  let gameServersService: jest.Mocked<GameServersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameServersService,
      ],
      controllers: [GameServersController],
    }).compile();

    controller = module.get<GameServersController>(GameServersController);
    gameServersService = module.get(GameServersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('#getAllGameServers()', () => {
    beforeEach(() => {
      gameServersService.getAllGameServers.mockResolvedValue([ mockGameServer ]);
    });

    it('should call service', async () => {
      const ret = await controller.getAllGameServers();
      expect(gameServersService.getAllGameServers).toHaveBeenCalled();
      expect(ret).toEqual([ mockGameServer ]);
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

  describe('#addGameServer()', () => {
    beforeEach(() => {
      gameServersService.addGameServer.mockResolvedValue(mockGameServer);
    });

    it('should add the game server', async () => {
      const dto = { name: 'FAKE_SERVER_NAME', port: '27015', address: 'FAKE_SERVER_ADDRESS', rconPassword: 'FAKE_RCON_PASSWORD' };
      const ret = await controller.addGameServer(dto);
      expect(gameServersService.addGameServer).toHaveBeenCalledWith(dto);
      expect(ret).toEqual(mockGameServer);
    });
  });

  describe('#removeGameServer()', () => {
    beforeEach(() => {
      gameServersService.removeGameServer.mockResolvedValue();
    });

    it('should call the service', async () => {
      await controller.removeGameServer('FAKE_ID');
      expect(gameServersService.removeGameServer).toHaveBeenCalledWith('FAKE_ID');
    });
  });
});
