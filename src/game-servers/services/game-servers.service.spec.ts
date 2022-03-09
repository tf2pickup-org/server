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
import { Connection, Model, Schema as MongooseSchema, Types } from 'mongoose';
import {
  getConnectionToken,
  getModelToken,
  MongooseModule,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';
import { GamesService } from '@/games/services/games.service';
import { Rcon } from 'rcon-client/lib';
import { GameServerProvider } from '../game-server-provider';
import { NotImplementedError } from '../errors/not-implemented.error';
import { NoFreeGameServerAvailableError } from '../errors/no-free-game-server-available.error';
import { GameState } from '@/games/models/game-state';

jest.mock('@/games/services/games.service');
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

@Schema()
class TestGameServer extends GameServer {
  async rcon(): Promise<Rcon> {
    return new Rcon({
      host: 'localhost',
      port: 27015,
      password: '123456',
    });
  }

  async voiceChannelName(): Promise<string> {
    return 'test';
  }
}

type TestGameServerDocument = TestGameServer & Document;
const testGameServerSchema = SchemaFactory.createForClass(TestGameServer);

class TestGameServerProvider implements GameServerProvider {
  gameServerProviderName = 'test';
  implementingClass = TestGameServer;
  findFirstFreeGameServer = jest.fn().mockRejectedValue('no free game servers');
}

describe('GameServersService', () => {
  let service: GameServersService;
  let mongod: MongoMemoryServer;
  let testGameServerModel: Model<TestGameServerDocument>;
  let gameModel: Model<GameDocument>;
  let testGameServer: GameServerDocument;
  let events: Events;
  let connection: Connection;
  let testGameServerProvider: TestGameServerProvider;
  let gameServerModel: Model<GameServerDocument>;

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
        {
          provide: getModelToken(TestGameServer.name),
          useFactory: (gameServerModel: Model<GameServerDocument>) =>
            gameServerModel.discriminator('test', testGameServerSchema),
          inject: [getModelToken(GameServer.name)],
        },
      ],
    }).compile();

    service = module.get<GameServersService>(GameServersService);
    testGameServerModel = module.get(getModelToken(TestGameServer.name));
    gameModel = module.get(getModelToken(Game.name));
    events = module.get(Events);
    connection = module.get(getConnectionToken());
    gameServerModel = module.get(getModelToken(GameServer.name));
  });

  beforeEach(async () => {
    testGameServer = await testGameServerModel.create({
      name: 'TEST_GAME_SERVER',
      address: 'localhost',
      port: '27015',
    });
  });

  beforeEach(() => {
    testGameServerProvider = new TestGameServerProvider();
    service.registerProvider(testGameServerProvider);
  });

  beforeEach(async () => {
    await service.onModuleInit();
  });

  afterEach(async () => {
    await testGameServerModel.deleteMany({});
    await gameModel.deleteMany({});
    await connection.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#getById()', () => {
    describe('when the provider is known', () => {
      it('should return the requested game server', async () => {
        const ret = await service.getById(testGameServer.id);
        expect(ret.id).toEqual(testGameServer.id);
        expect(ret instanceof TestGameServer).toBe(true);
      });
    });

    describe('when the provider is unknown', () => {
      let unknownGameServer: GameServerDocument;

      beforeEach(async () => {
        gameServerModel.discriminator(
          'FAKE_UNKNOWN_PROVIDER',
          new MongooseSchema({}),
        );

        unknownGameServer = await gameServerModel.create({
          provider: 'FAKE_UNKNOWN_PROVIDER',
          name: 'fake game server',
          address: 'localhost',
          port: '27015',
        });
      });

      it('should instantiate the game server anyway', async () => {
        const ret = await service.getById(unknownGameServer.id);
        expect(ret.id).toEqual(unknownGameServer.id);
        await expect(ret.rcon()).rejects.toThrow(NotImplementedError);
        await expect(ret.voiceChannelName()).rejects.toThrow(
          NotImplementedError,
        );
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
        (await testGameServerModel.findById(testGameServer.id)).name,
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
    describe('when there are no registered providers', () => {
      it('should throw an error', async () => {
        await expect(service.findFreeGameServer()).rejects.toThrow(
          NoFreeGameServerAvailableError,
        );
      });
    });

    describe('when there is a free server available', () => {
      beforeEach(async () => {
        const gs = (await service.getById(testGameServer.id)) as TestGameServer;
        testGameServerProvider.findFirstFreeGameServer.mockResolvedValue(gs);
      });

      it('should return this gameserver', async () => {
        const gameServer = await service.findFreeGameServer();
        expect(gameServer.id).toEqual(testGameServer.id);
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

      const gs = (await service.getById(testGameServer.id)) as TestGameServer;
      testGameServerProvider.findFirstFreeGameServer.mockResolvedValue(gs);
    });

    it('should assign the server', async () => {
      const gameServer = await service.assignGameServer(game.id);
      expect(gameServer.game.toString()).toEqual(game.id);
      const updatedGame = await gameModel.findById(game.id);
      expect(updatedGame.gameServer.toString()).toEqual(gameServer.id);
    });

    describe('when there are no free game servers', () => {
      beforeEach(() => {
        testGameServerProvider.findFirstFreeGameServer.mockRejectedValue(
          'no free gameserver',
        );
      });

      it('should throw', async () => {
        await expect(service.assignGameServer(game.id)).rejects.toThrowError();
      });
    });
  });

  describe('#maybeReleaseGameServer()', () => {
    describe('when the game has no gameserver assigned', () => {
      it('should do nothing', async () => {
        await service.maybeReleaseGameServer({} as Game);
        const gs = await gameServerModel.findById(testGameServer.id);
        expect(gs).toBeTruthy();
      });
    });

    describe('when the game has a gameserver assigned', () => {
      describe('and the gameserver has this game assigned as well', () => {
        let gameId: Types.ObjectId;

        beforeEach(async () => {
          gameId = new Types.ObjectId();

          testGameServer.game = gameId;
          await testGameServer.save();
        });

        it('should release the gameserver', async () => {
          await service.maybeReleaseGameServer({
            gameServer: testGameServer.id,
            id: gameId.toString(),
          } as Game);
          const gameServer = await gameServerModel.findById(testGameServer.id);
          expect(gameServer.game).toBe(undefined);
        });
      });

      describe('and the gameserver has another game assigned', () => {
        let gameId: Types.ObjectId;

        beforeEach(async () => {
          gameId = new Types.ObjectId();
          testGameServer.game = gameId;
          await testGameServer.save();
        });

        it('should not release the gameserver', async () => {
          await service.maybeReleaseGameServer({
            gameServer: testGameServer.id,
            id: new Types.ObjectId().toString(),
          } as Game);
          const gameServer = await gameServerModel.findById(testGameServer.id);
          expect(gameServer.game).toEqual(gameId);
        });
      });
    });
  });

  describe('#checkForGameServersToRelease()', () => {
    describe('when there are gameservers that are not properly released', () => {
      beforeEach(async () => {
        const game = await gameModel.create({
          number: 1,
          map: 'cp_badlands',
          slots: [],
        });
        game.state = GameState.ended;
        await game.save();

        testGameServer.game = game._id;
        await testGameServer.save();
      });

      it('should release the gameservers', async () => {
        await service.checkForGameServersToRelease();
        const gameServer = await service.getById(testGameServer.id);
        expect(gameServer.game).toBe(undefined);
      });
    });
  });
});
