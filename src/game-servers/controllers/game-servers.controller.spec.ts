import { Test, TestingModule } from '@nestjs/testing';
import { GameServersController } from './game-servers.controller';
import { GameServersService } from '../services/game-servers.service';
import { GameServer } from '../models/game-server';
import { NotFoundException } from '@nestjs/common';

class GameServersServiceStub {
  gameServer: GameServer = {
    name: 'FAKE_NAME',
    address: 'FAKE_ADDRESS',
    port: '27015',
    rconPassword: 'FAKE_RCON_PASSWORD',
  };

  async getAllGameServers() { return new Promise(resolve => resolve([ this.gameServer ])); }
  async getById(id: string) { return new Promise(resolve => resolve(this.gameServer)); }
  async addGameServer(gameServer: any) { return new Promise(resolve => resolve(gameServer)); }
  async removeGameServer(id: string) { return new  Promise(resolve => resolve()); }
}

describe('GameServers Controller', () => {
  let controller: GameServersController;
  let gameServersService: GameServersServiceStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: GameServersService, useClass: GameServersServiceStub },
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
    it('should call service', async () => {
      const spy = jest.spyOn(gameServersService, 'getAllGameServers');
      const ret = await controller.getAllGameServers();
      expect(spy).toHaveBeenCalled();
      expect(ret).toEqual([ gameServersService.gameServer ] as any[]);
    });
  });

  describe('#getGameServer()', () => {
    it('should return the game server', async () => {
      const spy = jest.spyOn(gameServersService, 'getById');
      const ret = await controller.getGameServer('FAKE_ID');
      expect(spy).toHaveBeenCalledWith('FAKE_ID');
      expect(ret).toEqual(gameServersService.gameServer as any);
    });

    it('should return 404', async () => {
      jest.spyOn(gameServersService, 'getById').mockImplementation(() => new Promise(resolve => resolve(null)));
      await expect(controller.getGameServer('FAKE_ID')).rejects.toThrow(NotFoundException);
    });
  });

  describe('#addGameServer()', () => {
    it('should add the game server', async () => {
      const spy = jest.spyOn(gameServersService, 'addGameServer');
      const ret = await controller.addGameServer(gameServersService.gameServer);
      expect(spy).toHaveBeenCalledWith(gameServersService.gameServer);
      expect(ret).toEqual(gameServersService.gameServer as any);
    });
  });

  describe('#removeGameServer()', () => {
    it('should call the service', async () => {
      const spy = jest.spyOn(gameServersService, 'removeGameServer');
      await controller.removeGameServer('FAKE_ID');
      expect(spy).toHaveBeenCalledWith('FAKE_ID');
    });
  });
});
