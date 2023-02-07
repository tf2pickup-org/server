import { Test, TestingModule } from '@nestjs/testing';
import { GameServersService } from './game-servers.service';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Game, GameDocument, gameSchema } from '@/games/models/game';
import { Connection, Model, Types } from 'mongoose';
import {
  getConnectionToken,
  getModelToken,
  MongooseModule,
} from '@nestjs/mongoose';
import { GamesService } from '@/games/services/games.service';
import {
  GameServerProvider,
  GameServerReleaseReason,
} from '../game-server-provider';
import { NoFreeGameServerAvailableError } from '../errors/no-free-game-server-available.error';
import { Events } from '@/events/events';
import { GameServerControls } from '../interfaces/game-server-controls';
import { Tf2Team } from '@/games/models/tf2-team';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { SlotStatus } from '@/games/models/slot-status';
import { PlayerConnectionStatus } from '@/games/models/player-connection-status';
import { GameState } from '@/games/models/game-state';
import { PlayerId } from '@/players/types/player-id';
import { GameId } from '@/games/game-id';

jest.mock('@/games/services/games.service');

class TestGameServerProvider implements GameServerProvider {
  gameServerProviderName = 'test';
  findGameServerOptions = jest.fn();
  takeGameServer = jest.fn();
  releaseGameServer = jest.fn();
  takeFirstFreeGameServer = jest.fn().mockRejectedValue('no free game servers');
  getControls = jest.fn();
}

describe('GameServersService', () => {
  let service: GameServersService;
  let mongod: MongoMemoryServer;
  let gameModel: Model<GameDocument>;
  let connection: Connection;
  let testGameServerProvider: TestGameServerProvider;
  let events: Events;
  let gameId: GameId;

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
    events = module.get(Events);
    gameId = new Types.ObjectId() as GameId;
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

  describe('#takeFirstFreeGameServer()', () => {
    describe('when there are no registered providers', () => {
      it('should throw an error', async () => {
        await expect(service.takeFirstFreeGameServer(gameId)).rejects.toThrow(
          NoFreeGameServerAvailableError,
        );
      });
    });

    describe('when there is a free server available', () => {
      beforeEach(() => {
        testGameServerProvider.takeFirstFreeGameServer.mockResolvedValue({
          id: 'FAKE_GAME_SERVER',
          name: 'FAKE GAME SERVER',
          address: 'FAKE_ADDRESS',
          port: 27015,
        });
      });

      it('should return this gameserver', async () => {
        const gameServer = await service.takeFirstFreeGameServer(gameId);
        expect(gameServer.id).toEqual('FAKE_GAME_SERVER');
        expect(gameServer.provider).toEqual('test');
      });
    });
  });

  describe('#takeGameServer()', () => {
    beforeEach(() => {
      testGameServerProvider.takeGameServer.mockResolvedValue({
        id: 'FAKE_GAME_SERVER',
        name: 'FAKE GAME SERVER',
        address: 'FAKE_ADDRESS',
        port: 27015,
      });
    });

    it('should take the given gameserver', async () => {
      const server = await service.takeGameServer(
        { id: 'FAKE_GAME_SERVER', provider: 'test' },
        gameId,
      );
      expect(testGameServerProvider.takeGameServer).toHaveBeenCalledWith({
        gameServerId: 'FAKE_GAME_SERVER',
        gameId,
      });
      expect(server.id).toEqual('FAKE_GAME_SERVER');
      expect(server.provider).toEqual('test');
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

      testGameServerProvider.takeFirstFreeGameServer.mockResolvedValue({
        id: 'FAKE_GAME_SERVER',
        name: 'FAKE GAME SERVER',
        address: 'FAKE_ADDRESS',
        port: 27015,
      });
    });

    it('should assign the server', async () => {
      const newGame = await service.assignGameServer(game._id);
      expect(newGame.gameServer?.id).toEqual('FAKE_GAME_SERVER');
      expect(
        testGameServerProvider.takeFirstFreeGameServer,
      ).toHaveBeenCalledWith({
        gameId: game._id,
      });
    });

    describe('when there are no free game servers', () => {
      beforeEach(() => {
        testGameServerProvider.takeFirstFreeGameServer.mockRejectedValue(
          'no free gameserver',
        );
      });

      it('should throw', async () => {
        await expect(service.assignGameServer(game._id)).rejects.toThrow();
      });
    });

    describe('when trying to assign the specific free gameserver', () => {
      beforeEach(() => {
        testGameServerProvider.takeGameServer.mockResolvedValue({
          id: 'FAKE_GAME_SERVER',
          name: 'FAKE GAME SERVER',
          address: 'FAKE_ADDRESS',
          port: 27015,
        });
      });

      it('should assign the given gameserver', async () => {
        const newGame = await service.assignGameServer(game._id, {
          id: 'FAKE_GAME_SERVER',
          provider: 'test',
        });
        expect(newGame.gameServer?.id).toEqual('FAKE_GAME_SERVER');
        expect(testGameServerProvider.takeGameServer).toHaveBeenCalledWith({
          gameServerId: 'FAKE_GAME_SERVER',
          gameId: game._id,
        });
      });

      describe('and the game has a gameserver already assigned', () => {
        beforeEach(async () => {
          testGameServerProvider.takeFirstFreeGameServer.mockResolvedValueOnce({
            id: 'FAKE_GAME_SERVER_2',
            name: 'FAKE GAME SERVER 2',
            address: 'FAKE_ADDRESS',
            port: 27025,
          });

          await service.assignGameServer(game._id);
        });

        it('should release the assigned gameserver', async () => {
          await service.assignGameServer(game._id, {
            id: 'FAKE_GAME_SERVER',
            provider: 'test',
          });

          expect(testGameServerProvider.releaseGameServer).toHaveBeenCalledWith(
            {
              gameServerId: 'FAKE_GAME_SERVER_2',
              gameId: game._id,
              reason: GameServerReleaseReason.Manual,
            },
          );
        });

        it('should reset the connect info', async () => {
          const ret = await service.assignGameServer(game.id, {
            id: 'FAKE_GAME_SERVER',
            provider: 'test',
          });

          expect(ret.connectString).toBe(undefined);
          expect(ret.stvConnectString).toBe(undefined);
          expect(ret.connectInfoVersion).toEqual(game.connectInfoVersion + 1);
          expect(ret.state).toEqual(GameState.created);
        });

        describe('when there are players', () => {
          beforeEach(async () => {
            game.slots = [
              {
                player: new Types.ObjectId() as PlayerId,
                team: Tf2Team.blu,
                gameClass: Tf2ClassName.soldier,
                status: SlotStatus.active,
                connectionStatus: PlayerConnectionStatus.connected,
                events: [],
              },
              {
                player: new Types.ObjectId() as PlayerId,
                team: Tf2Team.red,
                gameClass: Tf2ClassName.soldier,
                status: SlotStatus.active,
                connectionStatus: PlayerConnectionStatus.joining,
                events: [],
              },
            ];
            await game.save();
          });

          it('should set player connection status of all players to offline', async () => {
            const ret = await service.assignGameServer(game.id, {
              id: 'FAKE_GAME_SERVER',
              provider: 'test',
            });
            expect(ret.slots.length > 0).toBe(true);
            expect(
              ret.slots.every(
                (s) => s.connectionStatus === PlayerConnectionStatus.offline,
              ),
            ).toBe(true);
          });
        });
      });
    });
  });
});
