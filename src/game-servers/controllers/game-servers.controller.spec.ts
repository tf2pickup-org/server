import { Test, TestingModule } from '@nestjs/testing';
import { GameServersController } from './game-servers.controller';
import { GameServersService } from '../services/game-servers.service';
import { NotFoundException } from '@nestjs/common';
import { ObjectId } from 'mongodb';

jest.mock('../services/game-servers.service');

const mockGameServer = {
  id: new ObjectId(),
  name: 'FAKE_NAME',
  address: 'FAKE_ADDRESS',
  port: '27015',
  rconPassword: 'FAKE_RCON_PASSWORD',
};

describe('GameServersController', () => {
  let controller: GameServersController;
  let gameServersService: GameServersService;

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

  beforeEach(() => {
    gameServersService.getAllGameServers = () => Promise.resolve([ mockGameServer ] as any[]);
    gameServersService.getById = () => Promise.resolve(mockGameServer as any);
    gameServersService.addGameServer = () => Promise.resolve(mockGameServer as any);
    gameServersService.removeGameServer = () => Promise.resolve();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('#getAllGameServers()', () => {
    it('should call service', async () => {
      const ret = await controller.getAllGameServers();
      expect(ret).toEqual([ mockGameServer ]);
    });
  });

  describe('#getGameServer()', () => {
    it('should return the game server', async () => {
      const ret = await controller.getGameServer(new ObjectId());
      expect(ret).toEqual(mockGameServer);
    });

    describe('when the requested server does not exist', () => {
      beforeEach(() => {
        gameServersService.getById = () => Promise.resolve(null);
      });

      it('should return 404', async () => {
        await expect(controller.getGameServer(new ObjectId())).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('#addGameServer()', () => {
    it('should add the game server', async () => {
      const spy = jest.spyOn(gameServersService, 'addGameServer');
      const ret = await controller.addGameServer(mockGameServer);
      expect(spy).toHaveBeenCalledWith(mockGameServer);
      expect(ret).toEqual(mockGameServer);
    });
  });

  describe('#removeGameServer()', () => {
    it('should call the service', async () => {
      const spy = jest.spyOn(gameServersService, 'removeGameServer');
      await controller.removeGameServer(mockGameServer.id);
      expect(spy).toHaveBeenCalledWith(mockGameServer.id);
    });
  });
});
