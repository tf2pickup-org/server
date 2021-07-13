import { Test, TestingModule } from '@nestjs/testing';
import { GameServersService } from './game-servers.service';
import {
  GameServer,
  GameServerDocument,
  GameServerSchema,
} from '../models/game-server';
import { ObjectId } from 'mongodb';
import { typegooseTestingModule } from '@/utils/testing-typegoose-module';
import * as isServerOnline from '../utils/is-server-online';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Events } from '@/events/events';
import { Game, GameDocument, gameSchema } from '@/games/models/game';
import { Error, Model } from 'mongoose';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';

jest.mock('dns');

describe('GameServersService', () => {
  let service: GameServersService;
  let mongod: MongoMemoryServer;
  let gameServerModel: Model<GameServerDocument>;
  let gameModel: Model<GameDocument>;
  let testGameServer: GameServerDocument;
  let events: Events;

  beforeAll(() => (mongod = new MongoMemoryServer()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        typegooseTestingModule(mongod),
        MongooseModule.forFeature([
          { name: GameServer.name, schema: GameServerSchema },
          { name: Game.name, schema: gameSchema },
        ]),
      ],
      providers: [GameServersService, Events],
    }).compile();

    service = module.get<GameServersService>(GameServersService);
    gameServerModel = module.get(getModelToken(GameServer.name));
    gameModel = module.get(getModelToken(Game.name));
    events = module.get(Events);
  });

  beforeEach(async () => {
    testGameServer = await gameServerModel.create({
      name: 'TEST_GAME_SERVER',
      address: 'localhost',
      port: '27015',
      rconPassword: '123456',
      resolvedIpAddresses: ['127.0.0.1'],
    });
  });

  afterEach(async () => {
    await gameServerModel.deleteMany({});
    await gameModel.deleteMany({});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#getAllServers()', () => {
    it('should return all game servers', async () => {
      const ret = await service.getAllGameServers();
      expect(ret.length).toBe(1);
      expect(ret[0].id).toEqual(testGameServer.id);
    });

    describe('when a server is deleted', () => {
      beforeEach(async () => {
        testGameServer.deleted = true;
        await testGameServer.save();
      });

      it('should not list deleted server', async () => {
        const ret = await service.getAllGameServers();
        expect(ret.length).toBe(0);
      });
    });
  });

  describe('#getById()', () => {
    it('should return the requested game server', async () => {
      const ret = await service.getById(testGameServer.id);
      expect(ret.id).toEqual(testGameServer.id);
    });
  });

  describe('#addGameServer()', () => {
    describe('when there are no mumble channels taken', () => {
      let gameServer: GameServer;

      beforeEach(async () => {
        gameServer = await service.addGameServer({
          name: 'test game server',
          address: 'fake_game_server_address',
          port: '27017',
          rconPassword: 'test rcon password',
        });
      });

      it('should assign mumble channel name', () => {
        expect(gameServer.mumbleChannelName).toEqual('1');
      });
    });

    describe('when first mumble channel is taken', () => {
      let gameServer: GameServer;

      beforeEach(async () => {
        testGameServer.mumbleChannelName = '1';
        await testGameServer.save();

        gameServer = await service.addGameServer({
          name: 'test game server',
          address: 'fake_game_server_address',
          port: '27017',
          rconPassword: 'test rcon password',
        });
      });

      it('should assign the next mumble channel', async () => {
        expect(gameServer.mumbleChannelName).toEqual('2');
      });
    });

    describe('when added', () => {
      let gameServer: GameServer;

      beforeEach(async () => {
        gameServer = await service.addGameServer({
          name: 'test game server',
          address: 'fake_game_server_address',
          port: '27017',
          rconPassword: 'test rcon password',
          mumbleChannelName: 'some mumble channel',
        });
      });

      it('should resolve ip addresses', () => {
        expect(gameServer.resolvedIpAddresses).toEqual(['1.2.3.4']);
      });

      it('should save the mumble channel', () => {
        expect(gameServer.mumbleChannelName).toEqual('some mumble channel');
      });
    });

    describe('when the address is a raw IP address', () => {
      let gameServer: GameServer;

      beforeEach(async () => {
        gameServer = await service.addGameServer({
          name: 'test game server',
          address: '151.80.108.144',
          port: '27017',
          rconPassword: 'test rcon password',
          mumbleChannelName: 'some mumble channel name',
        });
      });

      it('should store the ip address', () => {
        expect(gameServer.resolvedIpAddresses).toEqual(['151.80.108.144']);
      });
    });

    it('should emit the gameServerAdded event', async () =>
      new Promise<void>((resolve) => {
        events.gameServerAdded.subscribe(({ gameServer, adminId }) => {
          expect(adminId).toEqual('FAKE_ADMIN_ID');
          expect(gameServer.name).toEqual('fake game server');
          resolve();
        });

        service.addGameServer(
          {
            name: 'fake game server',
            address: '127.0.0.1',
            port: '27017',
            rconPassword: 'test rcon password',
            mumbleChannelName: '',
          },
          'FAKE_ADMIN_ID',
        );
      }));
  });

  describe('#removeGameServer()', () => {
    it('should mark the given game server as deleted', async () => {
      const ret = await service.removeGameServer(testGameServer.id);
      expect(ret.deleted).toBe(true);
      expect((await gameServerModel.findById(ret.id)).deleted).toBe(true);
    });

    it('should emit the gameServerRemoved event', async () =>
      new Promise<void>((resolve) => {
        events.gameServerRemoved.subscribe(({ gameServer, adminId }) => {
          expect(gameServer.id).toEqual(testGameServer.id);
          expect(adminId).toEqual('FAKE_ADMIN_ID');
          resolve();
        });

        service.removeGameServer(testGameServer.id, 'FAKE_ADMIN_ID');
      }));
  });

  describe('#findFreeGameServer()', () => {
    describe('when the server is online but taken', () => {
      beforeEach(async () => {
        testGameServer.game = new ObjectId();
        testGameServer.isOnline = true;
        await testGameServer.save();
      });

      it('should throw an error', async () => {
        await expect(service.findFreeGameServer()).rejects.toThrow(
          Error.DocumentNotFoundError,
        );
      });
    });

    describe('when the server is free but offline', () => {
      beforeEach(async () => {
        testGameServer.isOnline = false;
        await testGameServer.save();
      });

      it('should throw an error', async () => {
        await expect(service.findFreeGameServer()).rejects.toThrow(
          Error.DocumentNotFoundError,
        );
      });
    });

    describe('when the server is deleted', () => {
      beforeEach(async () => {
        testGameServer.deleted = true;
        await testGameServer.save();
      });

      it('should throw an error', async () => {
        await expect(service.findFreeGameServer()).rejects.toThrow(
          Error.DocumentNotFoundError,
        );
      });
    });

    describe('when the server is both free and online', () => {
      beforeEach(async () => {
        testGameServer.isOnline = true;
        await testGameServer.save();
      });

      it('should return this game server', async () => {
        expect((await service.findFreeGameServer()).id).toEqual(
          testGameServer.id,
        );
      });
    });
  });

  describe('#assignFreeGameServer()', () => {
    let game: GameDocument;

    beforeEach(async () => {
      game = await gameModel.create({
        number: 1,
        map: 'cp_badlands',
        slots: [],
      });

      testGameServer.isOnline = true;
      await testGameServer.save();
    });

    it('should assign the server', async () => {
      const gameServer = await service.assignFreeGameServer(game);
      expect(gameServer.game.toString()).toEqual(game.id);
      expect(game.gameServer.toString()).toEqual(gameServer.id);
    });

    describe('when there are no free game servers', () => {
      beforeEach(async () => {
        const game2 = await gameModel.create({
          number: 2,
          map: 'cp_badlands',
          slots: [],
        });
        await service.assignFreeGameServer(game2);
      });

      it('should throw', async () => {
        await expect(service.assignFreeGameServer(game)).rejects.toThrowError();
      });
    });
  });

  describe('#releaseServer()', () => {
    it('should remove the game property', async () => {
      await service.releaseServer(testGameServer.id);
      expect((await service.getById(testGameServer.id)).game).toBe(undefined);
    });

    describe('when the game server does not exist', () => {
      it('should throw an error', async () => {
        await expect(
          service.releaseServer(new ObjectId().toString()),
        ).rejects.toThrow(Error.DocumentNotFoundError);
      });
    });
  });

  describe('#getGameServerByEventSource()', () => {
    it('should return the correct server', async () => {
      const server = await service.getGameServerByEventSource({
        address: '127.0.0.1',
        port: 27015,
      });
      expect(server.id).toEqual(testGameServer.id);
    });
  });

  describe('#checkAllServers()', () => {
    it('should check whether every server is online', async () => {
      const spy = jest.spyOn(isServerOnline, 'isServerOnline');
      await service.checkAllServers();
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith('localhost', 27015);

      const gameServer = await gameServerModel.findById(testGameServer.id);
      expect(gameServer.isOnline).toBe(true);
    });
  });
});
