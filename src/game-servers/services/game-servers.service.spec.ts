import { Test, TestingModule } from '@nestjs/testing';
import { GameServersService } from './game-servers.service';
import { TypegooseModule, getModelToken } from 'nestjs-typegoose';
import { GameServer } from '../models/game-server';
import { DocumentType, ReturnModelType } from '@typegoose/typegoose';
import { ObjectId } from 'mongodb';
import { typegooseTestingModule } from '@/utils/testing-typegoose-module';
import * as isServerOnline from '../utils/is-server-online';
import { MongoMemoryServer } from 'mongodb-memory-server';

describe('GameServersService', () => {
  let service: GameServersService;
  let mongod: MongoMemoryServer;
  let gameServerModel: ReturnModelType<typeof GameServer>;
  let testGameServer: DocumentType<GameServer>;

  beforeAll(() => mongod = new MongoMemoryServer());
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        typegooseTestingModule(mongod),
        TypegooseModule.forFeature([GameServer]),
      ],
      providers: [
        GameServersService,
      ],
    }).compile();

    service = module.get<GameServersService>(GameServersService);
    gameServerModel = module.get(getModelToken('GameServer'));
  });

  beforeEach(async () => {
    testGameServer = await gameServerModel.create({
      name: 'TEST_GAME_SERVER',
      address: 'localhost',
      port: '27015',
      rconPassword: '123456',
      resolvedIpAddresses: [ '127.0.0.1' ],
    });
  });

  afterEach(async () => await gameServerModel.deleteMany({ }));

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#getAllServers()', () => {
    it('should query model', async () => {
      const ret = await service.getAllGameServers();
      expect(ret.length).toBe(1);
      expect(ret[0].toJSON()).toEqual(testGameServer.toJSON());
    });
  });

  describe('#getById()', () => {
    it('should query model', async () => {
      const ret = await service.getById(testGameServer.id);
      expect(ret.toJSON()).toEqual(testGameServer.toJSON());
    });
  });

  describe('#removeGameServer()', () => {
    it('should delete the given game server', async () => {
      await service.removeGameServer(testGameServer.id);
      expect(await gameServerModel.countDocuments()).toBe(0);
    });

    it('should fail gracefully', async () => {
      jest.spyOn(gameServerModel, 'deleteOne').mockResolvedValue({ ok: 0 });
      await expect(service.removeGameServer(testGameServer.id)).rejects.toThrowError('unable to remove game server');
    });
  });

  describe('#findFreeGameServer()', () => {
    it('should return the server that is both online and free', async () => {
      testGameServer.isFree = true;
      testGameServer.isOnline = true;
      await testGameServer.save();

      const goodServer = await service.findFreeGameServer();
      expect(goodServer.toJSON()).toEqual(testGameServer.toJSON());

      testGameServer.isFree = false;
      testGameServer.isOnline = true;
      await testGameServer.save();
      expect(await service.findFreeGameServer()).toBeNull();

      testGameServer.isFree = true;
      testGameServer.isOnline = false;
      await testGameServer.save();
      expect(await service.findFreeGameServer()).toBeNull();
    });
  });

  describe('#takeServer()', () => {
    it('should set isFree property to false and save', async () => {
      await service.takeServer(testGameServer.id);
      expect((await service.getById(testGameServer.id)).isFree).toBe(false);
    });

    it('should fail gracefully', async () => {
      await expect(service.takeServer(new ObjectId().toString())).rejects.toThrowError('no such game server');
    });
  });

  describe('#releaseServer()', () => {
    it('should set isFree property to true and save', async () => {
      await service.releaseServer(testGameServer.id);
      expect((await service.getById(testGameServer.id)).isFree).toBe(true);
    });
  });

  describe('#getGameServerByEventSource()', () => {
    it('should return the correct server', async () => {
      const server = await service.getGameServerByEventSource({ address: '127.0.0.1', port: 27015 });
      expect(server.toJSON()).toEqual(testGameServer.toJSON());
    });
  });

  describe('#checkAllServers()', () => {
    it('should check whether every server is online', async () => {
      const spy = jest.spyOn(isServerOnline, 'isServerOnline').mockResolvedValue(true);
      await service.checkAllServers();
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith('localhost', 27015);

      const gameServer = await gameServerModel.findById(testGameServer.id);
      expect(gameServer.isOnline).toBe(true);
    });
  });
});
