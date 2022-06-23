import { Environment } from '@/environment/environment';
import { Events } from '@/events/events';
import { NoFreeGameServerAvailableError } from '@/game-servers/errors/no-free-game-server-available.error';
import {
  GameServer,
  gameServerSchema,
} from '@/game-servers/models/game-server';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import {
  getConnectionToken,
  getModelToken,
  MongooseModule,
} from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, Error, Model, Types } from 'mongoose';
import { Rcon } from 'rcon-client';
import {
  StaticGameServer,
  StaticGameServerDocument,
} from '../models/static-game-server';
import { staticGameServerModelProvider } from '../static-game-server-model.provider';
import { staticGameServerProviderName } from '../static-game-server-provider-name';
import { StaticGameServersService } from './static-game-servers.service';

jest.mock('@/environment/environment');
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

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        mongooseTestingModule(mongod),
        MongooseModule.forFeature([
          {
            name: GameServer.name,
            schema: gameServerSchema,
          },
        ]),
      ],
      providers: [
        StaticGameServersService,
        Events,
        Environment,
        staticGameServerModelProvider,
        GameServersService,
      ],
    }).compile();

    service = module.get<StaticGameServersService>(StaticGameServersService);
    connection = module.get(getConnectionToken());
    staticGameServerModel = module.get(getModelToken(StaticGameServer.name));
    events = module.get(Events);
    gameServersService = module.get(GameServersService);
  });

  beforeEach(async () => {
    testGameServer = (await staticGameServerModel.create({
      name: 'TEST_GAME_SERVER',
      address: 'localhost',
      port: '27015',
      internalIpAddress: '127.0.0.1',
      rconPassword: '123456',
      isOnline: true,
      isClean: true,
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
    await connection.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('when a gameserver is taken for a game', () => {
    beforeEach(async () => await service.onModuleInit());

    beforeEach(async () => {
      const oldGameServer = plainToInstance(
        StaticGameServer,
        await staticGameServerModel
          .findById(testGameServer.id)
          .orFail()
          .lean()
          .exec(),
      );
      const newGameServer = plainToInstance(
        StaticGameServer,
        await staticGameServerModel
          .findByIdAndUpdate(
            testGameServer.id,
            { $set: { game: new Types.ObjectId() } },
            { new: true },
          )
          .lean()
          .exec(),
      );
      events.gameServerUpdated.next({ oldGameServer, newGameServer });
      await waitForDatabase();
    });

    it('should mark the gameserver as dirty', async () => {
      const gameServer = await staticGameServerModel.findById(
        testGameServer.id,
      );
      expect(gameServer.isClean).toBe(false);
    });
  });

  describe('when a gameserver is freed', () => {
    beforeEach(async () => await service.onModuleInit());

    beforeEach(async () => {
      testGameServer.game = new Types.ObjectId();
      testGameServer.isClean = false;
      await testGameServer.save();

      const oldGameServer = plainToInstance(
        StaticGameServer,
        await staticGameServerModel
          .findById(testGameServer.id)
          .orFail()
          .lean()
          .exec(),
      );
      const newGameServer = plainToInstance(
        StaticGameServer,
        await staticGameServerModel
          .findByIdAndUpdate(
            testGameServer.id,
            { $unset: { game: 1 } },
            { new: true },
          )
          .lean()
          .exec(),
      );

      events.gameServerUpdated.next({ oldGameServer, newGameServer });
      await waitForDatabase();
    });

    it('should mark the gameserver as clean', async () => {
      const gameServer = await staticGameServerModel.findById(
        testGameServer.id,
      );
      expect(gameServer.isClean).toBe(true);
    });
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

  describe('#getById(()', () => {
    it('should retrieve the gameserver by its id', async () => {
      const gameServer = await service.getById(testGameServer.id);
      expect(gameServer instanceof StaticGameServer).toBe(true);
      expect(gameServer.id).toEqual(testGameServer.id);
      expect(gameServer.provider).toEqual(staticGameServerProviderName);
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

  describe('#getCleanGameServers()', () => {
    describe('when there are clean gameservers', () => {
      it('should return clean game servers', async () => {
        const gameServers = await service.getCleanGameServers();
        expect(gameServers.length).toEqual(1);
        expect(gameServers.every((gs) => gs.isClean === true)).toBe(true);
      });
    });

    describe('when there are no clean gameservers', () => {
      beforeEach(async () => {
        testGameServer.isClean = false;
        await testGameServer.save();
      });

      it('should return an empty array', async () => {
        const gameServers = await service.getCleanGameServers();
        expect(gameServers.length).toEqual(0);
      });
    });
  });

  describe('#findFirstGameServer()', () => {
    describe('when there are clean gameservers', () => {
      it('should return the first gameserver', async () => {
        const gameServer = await service.findFirstFreeGameServer();
        expect(gameServer.id).toEqual(testGameServer.id);
      });
    });

    describe('when there are no clean gameservers', () => {
      beforeEach(async () => {
        testGameServer.isClean = false;
        await testGameServer.save();
      });

      it('should throw an error', async () => {
        await expect(service.findFirstFreeGameServer()).rejects.toThrow(
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
        await expect(service.findFirstFreeGameServer()).rejects.toThrow(
          NoFreeGameServerAvailableError,
        );
      });
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

  describe('#markAsDirty()', () => {
    it('should mark the gameserver as dirty', async () => {
      const gs = await service.markAsDirty(testGameServer.id);
      expect(gs.isClean).toBe(false);
    });
  });

  describe('#cleanupServer()', () => {
    beforeEach(async () => {
      testGameServer.isClean = false;
      await testGameServer.save();
    });

    it('should mark the gameserver as clean', async () => {
      await service.cleanupServer(testGameServer.id);
      const gameServer = await staticGameServerModel.findById(
        testGameServer.id,
      );
      expect(gameServer.isClean).toBe(true);
    });
  });
});
