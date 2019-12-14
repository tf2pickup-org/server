import { Test, TestingModule } from '@nestjs/testing';
import { GameServersController } from './game-servers.controller';
import { GameServersService } from '../services/game-servers.service';
import { GameServer } from '../models/game-server';

class GameServersServiceStub {
  gameServer: GameServer = {
    name: 'FAKE_NAME',
    address: 'FAKE_ADDRESS',
    port: 27015,
    rconPassword: 'FAKE_RCON_PASSWORD',
  };

  async getAllGameServers() { return new Promise(resolve => resolve([ this.gameServer ])); }
  async getById(id: string) { return new Promise(resolve => resolve(this.gameServer)); }
  async addGameServer(gameServer: any) { return new Promise(resolve => resolve(gameServer)); }
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
      const spy = spyOn(gameServersService, 'getAllGameServers').and.callThrough();
      const ret = await controller.getAllGameServers();
      expect(spy).toHaveBeenCalled();
      expect(ret).toEqual([ gameServersService.gameServer ] as any[]);
    });
  });

  describe('#getGameServer()', () => {
    it('should return the game server', async () => {
      const spy = spyOn(gameServersService, 'getById').and.callThrough();
      const ret = await controller.getGameServer('FAKE_ID');
      expect(spy).toHaveBeenCalledWith('FAKE_ID');
      expect(ret).toEqual(gameServersService.gameServer as any);
    });

    it('should return 404', async () => {
      spyOn(gameServersService, 'getById').and.returnValue(new Promise(resolve => resolve(null)));
      await expectAsync(controller.getGameServer('FAKE_ID')).toBeRejectedWithError();
    });
  });

  describe('#addGameServer()', () => {
    it('should add the game server', async () => {
      const spy = spyOn(gameServersService, 'addGameServer').and.callThrough();
      const ret = await controller.addGameServer(gameServersService.gameServer);
      expect(spy).toHaveBeenCalledWith(gameServersService.gameServer);
      expect(ret).toEqual(gameServersService.gameServer as any);
    });
  });
});
