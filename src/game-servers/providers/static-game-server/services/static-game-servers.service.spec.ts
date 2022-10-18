import { Events } from '@/events/events';
import { NoFreeGameServerAvailableError } from '@/game-servers/errors/no-free-game-server-available.error';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { Game, GameDocument, gameSchema } from '@/games/models/game';
import { GameState } from '@/games/models/game-state';
import { GamesService } from '@/games/services/games.service';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import {
  getConnectionToken,
  getModelToken,
  MongooseModule,
} from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, Error, Model, Types } from 'mongoose';
import { Rcon } from 'rcon-client';
import {
  StaticGameServer,
  StaticGameServerDocument,
  staticGameServerSchema,
} from '../models/static-game-server';
import { StaticGameServerControls } from '../static-game-server-controls';
import { StaticGameServersService } from './static-game-servers.service';

jest.mock('rcon-client', () => {
  return {
    Rcon: jest.fn().mockImplementation(function () {
      return {
        connect: jest.fn().mockResolvedValue(this),
        send: jest.fn().mockResolvedValue(this),
        end: jest.fn().mockResolvedValue(this),
        on: jest.fn(),
      };
    }),
  };
});

jest.mock('rxjs/operators', () => {
  const operators = jest.requireActual('rxjs/operators');
  return {
    ...operators,
    delay: jest.fn(() => (s) => s),
  };
});

jest.mock('@/game-servers/services/game-servers.service');
jest.mock('@/games/services/games.service');

const waitForDatabase = () =>
  new Promise((resolve) => setTimeout(resolve, 100));

describe('StaticGameServersService', () => {
  let service: StaticGameServersService;
  let mongod: MongoMemoryServer;
  let connection: Connection;
  let staticGameServerModel: Model<StaticGameServerDocument>;
  let testGameServer: StaticGameServerDocument;
  let events: Events;
  let gameServersService: jest.Mocked<GameServersService>;
  let gamesService: GamesService;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        mongooseTestingModule(mongod),
        MongooseModule.forFeature([
          {
            name: StaticGameServer.name,
            schema: staticGameServerSchema,
          },
          {
            name: Game.name,
            schema: gameSchema,
          },
        ]),
      ],
      providers: [
        StaticGameServersService,
        Events,
        GameServersService,
        GamesService,
      ],
    }).compile();

    service = module.get<StaticGameServersService>(StaticGameServersService);
    connection = module.get(getConnectionToken());
    staticGameServerModel = module.get(getModelToken(StaticGameServer.name));
    events = module.get(Events);
    gameServersService = module.get(GameServersService);
    gamesService = module.get(GamesService);
  });

  beforeEach(async () => {
    testGameServer = (await staticGameServerModel.create({
      name: 'TEST_GAME_SERVER',
      address: 'localhost',
      port: '27015',
      internalIpAddress: '127.0.0.1',
      rconPassword: '123456',
      isOnline: true,
    })) as StaticGameServerDocument;
  });

  beforeEach(() => {
    (Rcon as jest.MockedClass<typeof Rcon>).prototype.send = jest
      .fn()
      .mockImplementation((command) => {
        return Promise.resolve(this);
      });

    (Rcon as jest.MockedClass<typeof Rcon>).prototype.end = jest.fn();
  });

  afterEach(async () => {
    await staticGameServerModel.deleteMany({});
    // @ts-expect-error
    await gamesService._reset();
    await connection.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#onModuleInit()', () => {
    beforeEach(async () => {
      const fiveMinutesAgo = new Date();
      fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 6);
      testGameServer.lastHeartbeatAt = fiveMinutesAgo;
      await testGameServer.save();
    });

    it('should mark dead gameservers as offline', async () => {
      await service.onModuleInit();
      const gameServer = (await staticGameServerModel.findById(
        testGameServer.id,
      )) as StaticGameServerDocument;
      expect(gameServer.isOnline).toBe(false);
    });

    it('should register itself as a plugin', async () => {
      await service.onModuleInit();
      expect(gameServersService.registerProvider).toHaveBeenCalledTimes(1);
    });
  });

  describe('#getById()', () => {
    it('should retrieve the gameserver by its id', async () => {
      const gameServer = await service.getById(testGameServer.id);
      expect(gameServer instanceof StaticGameServer).toBe(true);
      expect(gameServer.id).toEqual(testGameServer.id);
    });

    describe('when a gameserver does not exist', () => {
      it('should throw an error', async () => {
        const id = new Types.ObjectId().toString();
        await expect(service.getById(id)).rejects.toThrow(
          Error.DocumentNotFoundError,
        );
      });
    });
  });

  describe('#getAllGameServers()', () => {
    it('should retrieve all online gameservers', async () => {
      const gameServers = await service.getAllGameServers();
      expect(gameServers.length).toBe(1);
    });

    describe('when a gameserver is dead', () => {
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

  describe('#updateGameServer()', () => {
    it('should update the game server', async () => {
      const ret = await service.updateGameServer(testGameServer.id, {
        name: 'updated game server',
      });
      expect(ret.name).toEqual('updated game server');
      expect(
        (await staticGameServerModel.findById(testGameServer.id)).name,
      ).toEqual('updated game server');
    });

    it('should emit the gameServerUpdated event', async () => {
      let givenGameServerId: string;
      let givenGameServerName: string;

      service.gameServerUpdated.subscribe(({ newGameServer }) => {
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

  describe('#getFreeGameServers()', () => {
    describe('when there are free gameservers', () => {
      it('should return free game servers', async () => {
        const gameServers = await service.getFreeGameServers();
        expect(gameServers.length).toEqual(1);
        expect(gameServers.every((gs) => gs.game === undefined)).toBe(true);
      });
    });

    describe('when there are no free gameservers', () => {
      beforeEach(async () => {
        testGameServer.game = new Types.ObjectId();
        await testGameServer.save();
      });

      it('should return an empty array', async () => {
        const gameServers = await service.getFreeGameServers();
        expect(gameServers.length).toEqual(0);
      });
    });
  });

  describe('#getTakenGameServers()', () => {
    describe('when there are taken gameservers', () => {
      beforeEach(async () => {
        testGameServer.game = new Types.ObjectId();
        await testGameServer.save();
      });

      it('should return taken gameservers', async () => {
        const gameServers = await service.getTakenGameServers();
        expect(gameServers.length).toEqual(1);
        expect(gameServers.every((gs) => gs.game === undefined)).toBe(false);
      });
    });
  });

  describe('#findFirstGameServer()', () => {
    describe('when there are free gameservers', () => {
      it('should return the first gameserver', async () => {
        const gameServer = await service.takeFirstFreeGameServer();
        expect(gameServer.id).toEqual(testGameServer.id);
      });
    });

    describe('when there are no free gameservers', () => {
      beforeEach(async () => {
        testGameServer.game = new Types.ObjectId();
        await testGameServer.save();
      });

      it('should throw an error', async () => {
        await expect(service.takeFirstFreeGameServer()).rejects.toThrow(
          NoFreeGameServerAvailableError,
        );
      });
    });

    describe('when there are no online gameservers', () => {
      beforeEach(async () => {
        testGameServer.isOnline = false;
        await testGameServer.save();
      });

      it('should throw an error', async () => {
        await expect(service.takeFirstFreeGameServer()).rejects.toThrow(
          NoFreeGameServerAvailableError,
        );
      });
    });
  });

  describe('#getControls()', () => {
    it('should return controls', async () => {
      const controls = await service.getControls(testGameServer.id);
      expect(controls instanceof StaticGameServerControls).toBe(true);
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

        expect(await staticGameServerModel.findById(ret.id)).toBeTruthy();
      });

      it('should emit gameServerAdded event', async () => {
        let emittedGameServer: StaticGameServer;
        service.gameServerAdded.subscribe((gameServer) => {
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

  describe('#getDeadGameServers()', () => {
    describe('when there are no dead gameservers', () => {
      it('should return an empty array', async () => {
        const gameServers = await service.getDeadGameServers();
        expect(gameServers.length).toEqual(0);
      });
    });

    describe('when there are dead gameservers', () => {
      beforeEach(async () => {
        const fiveMinutesAgo = new Date();
        fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 6);
        testGameServer.lastHeartbeatAt = fiveMinutesAgo;
        await testGameServer.save();
      });

      it('should return the dead gameservers', async () => {
        const gameServers = await service.getDeadGameServers();
        expect(gameServers.length).toEqual(1);
        expect(gameServers.every((gs) => gs.isOnline === true)).toBe(true);
      });
    });
  });

  describe('#markAsOffline()', () => {
    it('should mark the gameserver as offline', async () => {
      const gs = await service.markAsOffline(testGameServer.id);
      expect(gs.isOnline).toBe(false);
    });
  });

  describe('#removeDeadGameServers()', () => {
    beforeEach(async () => {
      const fiveMinutesAgo = new Date();
      fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 6);
      testGameServer.lastHeartbeatAt = fiveMinutesAgo;
      await testGameServer.save();
    });

    it('should remove dead gameservers', async () => {
      await service.removeDeadGameServers();
      const gs = await staticGameServerModel.findById(testGameServer.id);
      expect(gs.isOnline).toBe(false);
    });
  });

  describe('#freeUnusedGameServers()', () => {
    let game: GameDocument;

    beforeEach(async () => {
      // @ts-expect-error
      game = await gamesService._createOne();
      game.state = GameState.ended;

      const endedAt = new Date();
      endedAt.setMinutes(endedAt.getMinutes() - 2);
      game.endedAt = endedAt;
      await game.save();

      testGameServer.game = game._id;
      await testGameServer.save();
    });

    it('should free gameservers that no longer run any game', async () => {
      await service.freeUnusedGameServers();
      const gs = await staticGameServerModel.findById(testGameServer.id);
      expect(gs.game).toBe(undefined);
    });

    describe('when a game is in progress', () => {
      beforeEach(async () => {
        game.state = GameState.started;
        await game.save();
      });

      it('should not free the gameserver', async () => {
        await service.freeUnusedGameServers();
        const gs = await staticGameServerModel.findById(testGameServer.id);
        expect(gs.game).toEqual(game._id);
      });
    });
  });
});
