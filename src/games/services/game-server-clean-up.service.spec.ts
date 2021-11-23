import { Events } from '@/events/events';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import {
  getConnectionToken,
  getModelToken,
  MongooseModule,
} from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, Model, Types } from 'mongoose';
import { Game, GameDocument, gameSchema } from '../models/game';
import { GameState } from '../models/game-state';
import { GameServerCleanUpService } from './game-server-clean-up.service';
import { GamesService } from './games.service';
import { ServerConfiguratorService } from './server-configurator.service';

jest.mock('./games.service');
jest.mock('@/game-servers/services/game-servers.service');
jest.mock('./server-configurator.service');

describe('GameServerCleanUpService', () => {
  let service: GameServerCleanUpService;
  let mongod: MongoMemoryServer;
  let connection: Connection;
  let gameModel: Model<GameDocument>;
  let gameServersService: jest.Mocked<GameServersService>;
  let gamesService: GamesService;
  let serverConfiguratorService: jest.Mocked<ServerConfiguratorService>;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        mongooseTestingModule(mongod),
        MongooseModule.forFeature([{ name: Game.name, schema: gameSchema }]),
      ],
      providers: [
        GameServerCleanUpService,
        GamesService,
        GameServersService,
        ServerConfiguratorService,
        Events,
      ],
    }).compile();

    service = module.get<GameServerCleanUpService>(GameServerCleanUpService);
    gameModel = module.get(getModelToken(Game.name));
    connection = module.get(getConnectionToken());
    gameServersService = module.get(GameServersService);
    gamesService = module.get(GamesService);
    serverConfiguratorService = module.get(ServerConfiguratorService);
  });

  afterEach(async () => {
    await gameModel.deleteMany({});
    await connection.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#cleanupUnusedGameServers()', () => {
    describe('when there is a game server with a game is in progress', () => {
      beforeEach(async () => {
        // @ts-expect-error
        const game = await gamesService._createOne();

        gameServersService.getAllGameServers.mockResolvedValue([
          {
            id: 'FAKE_GAMESERVER_1',
            createdAt: new Date(),
            name: 'FAKE_GAMESERVER_1',
            address: '127.0.0.1',
            internalIpAddress: '127.0.0.1',
            port: '27015',
            rconPassword: 'FAKE_RCON_PASSWORD',
            isAvailable: true,
            isOnline: true,
            priority: 1,
            game: game.id,
          },
        ]);
      });

      it('should not touch the game server', async () => {
        await service.cleanupUnusedGameServers();
        expect(
          serverConfiguratorService.cleanupServer,
        ).not.toHaveBeenCalledWith('FAKE_GAMESERVER_1');
        expect(gameServersService.releaseServer).not.toHaveBeenCalledWith(
          'FAKE_GAMESERVER_1',
        );
      });
    });

    describe('when there is a game server with a game that has just ended', () => {
      beforeEach(async () => {
        // @ts-expect-error
        const game = await gamesService._createOne();
        game.endedAt = new Date(Date.now() - 60 * 1000);
        game.state = GameState.ended;
        await game.save();

        gameServersService.getAllGameServers.mockResolvedValue([
          {
            id: 'FAKE_GAMESERVER_1',
            createdAt: new Date(),
            name: 'FAKE_GAMESERVER_1',
            address: '127.0.0.1',
            internalIpAddress: '127.0.0.1',
            port: '27015',
            rconPassword: 'FAKE_RCON_PASSWORD',
            isAvailable: true,
            isOnline: true,
            priority: 1,
            game: game.id,
          },
        ]);
      });

      it('should not touch the game server', async () => {
        await service.cleanupUnusedGameServers();
        expect(
          serverConfiguratorService.cleanupServer,
        ).not.toHaveBeenCalledWith('FAKE_GAMESERVER_1');
        expect(gameServersService.releaseServer).not.toHaveBeenCalledWith(
          'FAKE_GAMESERVER_1',
        );
      });
    });

    describe('when there is a game server with a game that ended long ago', () => {
      beforeEach(async () => {
        // @ts-expect-error
        const game = await gamesService._createOne();
        game.endedAt = new Date(Date.now() - 60 * 60 * 1000);
        game.state = GameState.ended;
        await game.save();

        gameServersService.getAllGameServers.mockResolvedValue([
          {
            id: 'FAKE_GAMESERVER_1',
            createdAt: new Date(),
            name: 'FAKE_GAMESERVER_1',
            address: '127.0.0.1',
            internalIpAddress: '127.0.0.1',
            port: '27015',
            rconPassword: 'FAKE_RCON_PASSWORD',
            isAvailable: true,
            isOnline: true,
            priority: 1,
            game: game.id,
          },
        ]);
      });

      it('should clean up the game server and release it', async () => {
        await service.cleanupUnusedGameServers();
        expect(serverConfiguratorService.cleanupServer).toHaveBeenCalledWith(
          'FAKE_GAMESERVER_1',
        );
        expect(gameServersService.releaseServer).toHaveBeenCalledWith(
          'FAKE_GAMESERVER_1',
        );
      });

      describe('even though the gameserver cleanup failed', () => {
        beforeEach(() => {
          serverConfiguratorService.cleanupServer.mockRejectedValue(
            new Error('fake rcon error'),
          );
        });

        it('should release the gameserver', async () => {
          await service.cleanupUnusedGameServers();
          expect(gameServersService.releaseServer).toHaveBeenCalledWith(
            'FAKE_GAMESERVER_1',
          );
        });
      });
    });
  });
});
