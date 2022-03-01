import { Test, TestingModule } from '@nestjs/testing';
import { GameServersService } from './game-servers.service';
import {
  GameServer,
  GameServerDocument,
  gameServerSchema,
} from '../models/game-server';
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
import { StaticGameServersService } from '../providers/static-game-server/services/static-game-servers.service';
import {
  StaticGameServer,
  StaticGameServerDocument,
} from '../providers/static-game-server/models/static-game-server';
import { GameServerProvider } from '../models/game-server-provider';
import { staticGameServerModelProvider } from '../providers/static-game-server/static-game-server-model.provider';

jest.mock('@/games/services/games.service');
jest.mock(
  '../providers/static-game-server/services/static-game-servers.service',
);

describe('GameServersService', () => {
  let service: GameServersService;
  let mongod: MongoMemoryServer;
  let staticGameServerModel: Model<StaticGameServerDocument>;
  let gameModel: Model<GameDocument>;
  let testGameServer: GameServerDocument;
  let events: Events;
  let connection: Connection;
  let staticGameServersService: jest.Mocked<StaticGameServersService>;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        mongooseTestingModule(mongod),
        MongooseModule.forFeature([
          { name: GameServer.name, schema: gameServerSchema },
          { name: Game.name, schema: gameSchema },
        ]),
      ],
      providers: [
        GameServersService,
        Events,
        GamesService,
        StaticGameServersService,
        staticGameServerModelProvider,
      ],
    }).compile();

    service = module.get<GameServersService>(GameServersService);
    staticGameServerModel = module.get(getModelToken(StaticGameServer.name));
    gameModel = module.get(getModelToken(Game.name));
    events = module.get(Events);
    connection = module.get(getConnectionToken());
    staticGameServersService = module.get(StaticGameServersService);
  });

  beforeEach(async () => {
    testGameServer = await staticGameServerModel.create({
      name: 'TEST_GAME_SERVER',
      address: 'localhost',
      port: '27015',
      internalIpAddress: '127.0.0.1',
      rconPassword: '123456',
      isOnline: true,
      isClean: true,
    });
  });

  afterEach(async () => {
    await staticGameServerModel.deleteMany({});
    await gameModel.deleteMany({});
    await connection.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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

  describe('#findFreeGameServer()', () => {
    describe('when there is a static server available', () => {
      beforeEach(() => {
        staticGameServersService.getCleanGameServers.mockResolvedValue([
          {
            name: 'TEST_STATIC_GAME_SERVER',
            address: 'localhost',
            port: '27015',
            rconPassword: '123456',
            isOnline: true,
          } as StaticGameServer,
        ]);
      });

      it('should return the game server', async () => {
        const gameServer = await service.findFreeGameServer();
        expect(gameServer.name).toEqual('TEST_STATIC_GAME_SERVER');
      });
    });

    describe('when there are no free game servers', () => {
      beforeEach(() => {
        staticGameServersService.getCleanGameServers.mockResolvedValue([]);
      });

      it('should throw an error', async () => {
        await expect(service.findFreeGameServer()).rejects.toThrowError();
      });
    });
  });

  describe('#assignGameServer()', () => {
    let game: GameDocument;

    beforeEach(async () => {
      game = await gameModel.create({
        number: 1,
        map: 'cp_badlands',
        slots: [],
      });

      const gs = (await service.getById(testGameServer.id)) as StaticGameServer;
      staticGameServersService.getCleanGameServers.mockResolvedValue([gs]);
    });

    it('should assign the server', async () => {
      const gameServer = await service.assignGameServer(game.id);
      expect(gameServer.game.toString()).toEqual(game.id);
      const updatedGame = await gameModel.findById(game.id);
      expect(updatedGame.gameServer.toString()).toEqual(gameServer.id);
    });

    describe('when there are no free game servers', () => {
      beforeEach(async () => {
        staticGameServersService.getCleanGameServers.mockResolvedValue([]);
      });

      it('should throw', async () => {
        await expect(service.assignGameServer(game.id)).rejects.toThrowError();
      });
    });
  });

  describe('#releaseGameServer()', () => {
    it('should remove the game property', async () => {
      await service.releaseGameServer(testGameServer.id);
      expect((await service.getById(testGameServer.id)).game).toBe(undefined);
    });
  });
});
