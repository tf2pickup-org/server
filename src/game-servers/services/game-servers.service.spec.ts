import { Test, TestingModule } from '@nestjs/testing';
import { GameServersService } from './game-servers.service';
import { getModelToken } from 'nestjs-typegoose';
import { GameServer } from '../models/game-server';
import { DocumentType } from '@typegoose/typegoose';

const gameServerModel = {
  find: (obj?: any) => new Promise(resolve => resolve(null)),
  findById: (id: string) => new Promise(resolve => resolve(null)),
  findOne: (obj: any) => new Promise(resolve => resolve(null)),
  deleteOne: (obj: any) => new Promise(resolve => resolve({ ok: true })),
};

describe('GameServersService', () => {
  let service: GameServersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameServersService,
        { provide: getModelToken('GameServer'), useValue: gameServerModel },
      ],
    }).compile();

    service = module.get<GameServersService>(GameServersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#getAllServers()', () => {
    it('should query model', async () => {
      const spy = spyOn(gameServerModel, 'find').and.callThrough();
      await service.getAllGameServers();
      expect(spy).toHaveBeenCalledWith();
    });
  });

  describe('#getById()', () => {
    it('should query model', async () => {
      const spy = spyOn(gameServerModel, 'findById').and.callThrough();
      await service.getById('FAKE_ID');
      expect(spy).toHaveBeenCalledWith('FAKE_ID');
    });
  });

  describe('#removeGameServer()', () => {
    it('should query model', async () => {
      const spy = spyOn(gameServerModel, 'deleteOne').and.callThrough();
      await service.removeGameServer('FAKE_ID');
      expect(spy).toHaveBeenCalledWith({ _id: 'FAKE_ID' });
    });

    it('should fail gracefully', async () => {
      spyOn(gameServerModel, 'deleteOne').and.returnValue(new Promise(resolve => resolve({ ok: false })));
      await expectAsync(service.removeGameServer('FAKE_ID')).toBeRejectedWithError('unable to remove game server');
    });
  });

  describe('#findFreeGameServer()', () => {
    it('should query model', async () => {
      const spy = spyOn(gameServerModel, 'findOne').and.callThrough();
      await service.findFreeGameServer();
      expect(spy).toHaveBeenCalledWith({ isOnline: true, isFree: true });
    });
  });

  describe('#takeServer()', () => {
    const gameServer = {
      isFree: true,
      name: 'FAKE_GAME_SERVER_NAME',
      save: () => null,
    };

    it('should set isFree property to false and save', async () => {
      const getByIdSpy = spyOn(service, 'getById').and.returnValue(new Promise(resolve => resolve(gameServer as DocumentType<GameServer>)));
      const saveSpy = spyOn(gameServer, 'save');
      await service.takeServer('FAKE_ID');
      expect(getByIdSpy).toHaveBeenCalledWith('FAKE_ID');
      expect(gameServer.isFree).toBe(false);
      expect(saveSpy).toHaveBeenCalled();
    });

    it('should fail gracefully', async () => {
      spyOn(service, 'getById').and.returnValue(new Promise(resolve => resolve(null)));
      await expectAsync(service.takeServer('FAKE_ID')).toBeRejectedWithError('no such game server');
    });
  });

  describe('#releaseServer()', () => {
    const gameServer = {
      isFree: false,
      name: 'FAKE_GAME_SERVER_NAME',
      save: () => null,
    };

    it('should set isFree property to true and save', async () => {
      const getByIdSpy = spyOn(service, 'getById').and.returnValue(new Promise(resolve => resolve(gameServer as DocumentType<GameServer>)));
      const saveSpy = spyOn(gameServer, 'save');
      await service.releaseServer('FAKE_ID');
      expect(getByIdSpy).toHaveBeenCalledWith('FAKE_ID');
      expect(gameServer.isFree).toBe(true);
      expect(saveSpy).toHaveBeenCalled();
    });
  });
});
