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
import { GameState } from '@/games/models/game-state';

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

  describe('#onModuleInit()', () => {
    beforeEach(async () => {
      const fiveMinutesAgo = new Date();
      fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
      testGameServer.lastHeartbeatAt = fiveMinutesAgo;
      await testGameServer.save();
    });

    it('should mark dead gameservers as offline', async () => {
      await service.onModuleInit();
      const gameServer = await gameServerModel.findById(testGameServer.id);
      expect(gameServer.isOnline).toBe(false);
    });
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

  describe('#heartbeat()', () => {
    describe('when adding a new gameserver', () => {
      it('should add the gameserver', async () => {
        const ret = await service.heartbeat({
          name: 'test game server',
          address: '193.70.80.2',
          port: '27015',
          rconPassword: '123456',
          internalIpAddress: '127.0.0.1',
        });
        expect(ret).toBeTruthy();
        expect(ret.name).toEqual('test game server');
        expect(ret.isOnline).toBe(true);

        expect(await gameServerModel.findById(ret.id)).toBeTruthy();
      });

      it('should emit gameServerAdded event', async () => {
        let emittedGameServer: GameServer;
        events.gameServerAdded.subscribe(({ gameServer }) => {
          emittedGameServer = gameServer;
        });
        await service.heartbeat({
          name: 'test game server',
          address: '193.70.80.2',
          port: '27015',
          rconPassword: '123456',
          internalIpAddress: '127.0.0.1',
        });
        expect(emittedGameServer).toBeTruthy();
        expect(emittedGameServer.name).toEqual('test game server');
        expect(emittedGameServer.isOnline).toBe(true);
      });
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

      events.gameServerUpdated.subscribe(({ newGameServer }) => {
        givenGameServerId = newGameServer.id;
        givenGameServerName = newGameServer.name;
      });

      await service.updateGameServer(testGameServer.id, {
        name: 'updated game server',
      });
      expect(givenGameServerId).toEqual(testGameServer.id);
      expect(givenGameServerName).toEqual('updated game server');
    });
  });

  describe('#markAsOffline()', () => {
    it('should mark the given game server as offline', async () => {
      const ret = await service.markAsOffline(testGameServer.id);
      expect(ret.isOnline).toBe(false);
      expect((await gameServerModel.findById(ret.id)).isOnline).toBe(false);
    });

    it('should emit the gameServerUpdated event', async () => {
      let givenGameServerId: string;

      events.gameServerUpdated.subscribe(({ newGameServer }) => {
        givenGameServerId = newGameServer.id;
      });

      await service.markAsOffline(testGameServer.id);
      expect(givenGameServerId).toEqual(testGameServer.id);
    });
  });

  describe('#findFreeGameServer()', () => {
    describe('when the server is online but taken', () => {
      beforeEach(async () => {
        const game1 = await gameModel.create({
          number: 2,
          map: 'cp_badlands',
          slots: [],
          state: GameState.started,
        });

        testGameServer.game = new ObjectId(game1.id);
        testGameServer.isOnline = true;
        await testGameServer.save();
      });

      it('should throw an error', async () => {
        await expect(service.findFreeGameServer()).rejects.toThrowError();
      });
    });

    describe('when the server has a game, but that game ended long ago', () => {
      beforeEach(async () => {
        const game2 = await gameModel.create({
          number: 2,
          map: 'cp_badlands',
          slots: [],
          state: GameState.ended,
          launchedAt: new Date(1635884999789),
          endedAt: new Date(1635888599789),
        });

        testGameServer.game = new ObjectId(game2.id);
        testGameServer.isOnline = true;
        await testGameServer.save();
      });

      it('should return this game server', async () => {
        expect((await service.findFreeGameServer()).id).toEqual(
          testGameServer.id,
        );
      });
    });

    describe('when the server has a game, which ended just now', () => {
      beforeEach(async () => {
        const game3 = await gameModel.create({
          number: 2,
          map: 'cp_badlands',
          slots: [],
          state: GameState.ended,
          launchedAt: new Date(1635884999789),
          endedAt: new Date(),
        });

        testGameServer.game = new ObjectId(game3.id);
        testGameServer.isOnline = true;
        await testGameServer.save();
      });

      it('should throw an error', async () => {
        await expect(service.findFreeGameServer()).rejects.toThrowError();
      });
    });

    describe('when the server is free but offline', () => {
      beforeEach(async () => {
        testGameServer.isOnline = false;
        await testGameServer.save();
      });

      it('should throw an error', async () => {
        await expect(service.findFreeGameServer()).rejects.toThrowError();
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
