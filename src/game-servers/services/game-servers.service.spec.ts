import { Test, TestingModule } from '@nestjs/testing';
import { GameServersService } from './game-servers.service';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Game, GameDocument, gameSchema } from '@/games/models/game';
import { Connection, Model } from 'mongoose';
import {
  getConnectionToken,
  getModelToken,
  MongooseModule,
} from '@nestjs/mongoose';
import { GamesService } from '@/games/services/games.service';
import { GameServerProvider } from '../game-server-provider';
import { NoFreeGameServerAvailableError } from '../errors/no-free-game-server-available.error';
import { Events } from '@/events/events';
import { GameServerControls } from '../interfaces/game-server-controls';

jest.mock('@/games/services/games.service');

class TestGameServerProvider implements GameServerProvider {
  gameServerProviderName = 'test';
  getControls = jest.fn();
  findFirstFreeGameServer = jest.fn().mockRejectedValue('no free game servers');
  onGameServerAssigned = jest.fn();
}

describe('GameServersService', () => {
  let service: GameServersService;
  let mongod: MongoMemoryServer;
  let gameModel: Model<GameDocument>;
  let connection: Connection;
  let testGameServerProvider: TestGameServerProvider;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        mongooseTestingModule(mongod),
        MongooseModule.forFeature([{ name: Game.name, schema: gameSchema }]),
      ],
      providers: [GameServersService, Events, GamesService],
    }).compile();

    service = module.get<GameServersService>(GameServersService);
    gameModel = module.get(getModelToken(Game.name));
    connection = module.get(getConnectionToken());
  });

  beforeEach(() => {
    testGameServerProvider = new TestGameServerProvider();
    service.registerProvider(testGameServerProvider);
  });

  afterEach(async () => {
    await gameModel.deleteMany({});
    await connection.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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
      beforeEach(() => {
        testGameServerProvider.findFirstFreeGameServer.mockResolvedValue({
          id: 'FAKE_GAME_SERVER',
          name: 'FAKE GAME SERVER',
          address: 'FAKE_ADDRESS',
          port: 27015,
        });
      });

      it('should return this gameserver', async () => {
        const gameServer = await service.findFreeGameServer();
        expect(gameServer.id).toEqual('FAKE_GAME_SERVER');
      });
    });
  });

  describe('#getControls()', () => {
    let testControls: GameServerControls;

    beforeEach(() => {
      testControls = {
        start: jest.fn(),
        rcon: jest.fn(),
        getLogsecret: jest.fn(),
      };
      testGameServerProvider.getControls.mockResolvedValue(testControls);
    });

    it('should query the provider for controls', async () => {
      const controls = await service.getControls({
        id: 'FAKE_GAME_SERVER',
        name: 'FAKE GAME SERVER',
        address: 'FAKE_ADDRESS',
        port: 27015,
        provider: 'test',
      });
      expect(controls).toBe(testControls);
      expect(testGameServerProvider.getControls).toHaveBeenCalledWith(
        'FAKE_GAME_SERVER',
      );
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

      testGameServerProvider.findFirstFreeGameServer.mockResolvedValue({
        id: 'FAKE_GAME_SERVER',
        name: 'FAKE GAME SERVER',
        address: 'FAKE_ADDRESS',
        port: 27015,
      });
    });

    it('should assign the server', async () => {
      const newGame = await service.assignGameServer(game.id);
      expect(newGame.gameServer.id).toEqual('FAKE_GAME_SERVER');
      expect(testGameServerProvider.onGameServerAssigned).toHaveBeenCalledWith({
        gameServerId: 'FAKE_GAME_SERVER',
        gameId: game.id,
      });
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
});
