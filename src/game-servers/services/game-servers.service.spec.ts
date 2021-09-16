import { Test, TestingModule } from '@nestjs/testing';
import { GameServersService } from './game-servers.service';
import {
  GameServer,
  GameServerDocument,
  GameServerSchema,
} from '../models/game-server';
import { ObjectId } from 'mongodb';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Events } from '@/events/events';
import { Game, GameDocument, gameSchema } from '@/games/models/game';
import { Connection, Error, Model } from 'mongoose';
import {
  getConnectionToken,
  getModelToken,
  MongooseModule,
} from '@nestjs/mongoose';
import { GamesService } from '@/games/services/games.service';

jest.mock('@/games/services/games.service');

describe('GameServersService', () => {
  let service: GameServersService;
  let mongod: MongoMemoryServer;
  let gameServerModel: Model<GameServerDocument>;
  let gameModel: Model<GameDocument>;
  let testGameServer: GameServerDocument;
  let events: Events;
  let connection: Connection;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        mongooseTestingModule(mongod),
        MongooseModule.forFeature([
          { name: GameServer.name, schema: GameServerSchema },
          { name: Game.name, schema: gameSchema },
        ]),
      ],
      providers: [GameServersService, Events, GamesService],
    }).compile();

    service = module.get<GameServersService>(GameServersService);
    gameServerModel = module.get(getModelToken(GameServer.name));
    gameModel = module.get(getModelToken(Game.name));
    events = module.get(Events);
    connection = module.get(getConnectionToken());
  });

  beforeEach(async () => {
    testGameServer = await gameServerModel.create({
      name: 'TEST_GAME_SERVER',
      address: 'localhost',
      port: '27015',
      rconPassword: '123456',
      resolvedIpAddresses: ['127.0.0.1'],
      isOnline: true,
    });
  });

  afterEach(async () => {
    await gameServerModel.deleteMany({});
    await gameModel.deleteMany({});
    await connection.close();
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
        testGameServer.isOnline = false;
        await testGameServer.save();
      });

      it('should not list dead server', async () => {
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

  describe('#updateGameServer()', () => {
    it('should update the game server', async () => {
      const ret = await service.updateGameServer(testGameServer.id, {
        name: 'updated game server',
      });
      expect(ret.name).toEqual('updated game server');
      expect((await gameServerModel.findById(testGameServer.id)).name).toEqual(
        'updated game server',
      );
    });

    it('should emit the gameServerUpdated event', async () => {
      let givenGameServerId: string;
      let givenGameServerName: string;
      let givenAdminId: string;

      events.gameServerUpdated.subscribe(({ newGameServer, adminId }) => {
        givenGameServerId = newGameServer.id;
        givenGameServerName = newGameServer.name;
        givenAdminId = adminId;
      });

      await service.updateGameServer(
        testGameServer.id,
        { name: 'updated game server' },
        'FAKE_ADMIN_ID',
      );
      expect(givenGameServerId).toEqual(testGameServer.id);
      expect(givenGameServerName).toEqual('updated game server');
      expect(givenAdminId).toEqual('FAKE_ADMIN_ID');
    });
  });

  describe('#removeGameServer()', () => {
    it('should mark the given game server as offline', async () => {
      const ret = await service.removeGameServer(testGameServer.id);
      expect(ret.isOnline).toBe(false);
      expect((await gameServerModel.findById(ret.id)).isOnline).toBe(false);
    });

    it('should emit the gameServerUpdated event', async () => {
      let givenGameServerId: string;
      let givenAdminId: string;

      events.gameServerUpdated.subscribe(({ newGameServer, adminId }) => {
        givenGameServerId = newGameServer.id;
        givenAdminId = adminId;
      });

      await service.removeGameServer(testGameServer.id, 'FAKE_ADMIN_ID');
      expect(givenGameServerId).toEqual(testGameServer.id);
      expect(givenAdminId).toEqual('FAKE_ADMIN_ID');
    });
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
      const gameServer = await service.assignFreeGameServer(game.id);
      expect(gameServer.game.toString()).toEqual(game.id);
      const updatedGame = await gameModel.findById(game.id);
      expect(updatedGame.gameServer.toString()).toEqual(gameServer.id);
    });

    describe('when there are no free game servers', () => {
      beforeEach(async () => {
        const game2 = await gameModel.create({
          number: 2,
          map: 'cp_badlands',
          slots: [],
        });
        await service.assignFreeGameServer(game2.id);
      });

      it('should throw', async () => {
        await expect(
          service.assignFreeGameServer(game.id),
        ).rejects.toThrowError();
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
});
