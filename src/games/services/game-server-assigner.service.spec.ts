import { Events } from '@/events/events';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import { waitABit } from '@/utils/wait-a-bit';
import { MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { CannotAssignGameServerError } from '../errors/cannot-assign-gameserver.error';
import { GameInWrongStateError } from '../errors/game-in-wrong-state.error';
import { Game, gameSchema } from '../models/game';
import { GameState } from '../models/game-state';
import { GameServerAssignerService } from './game-server-assigner.service';
import { GamesService } from './games.service';

jest.mock('./games.service');
jest.mock('@/game-servers/services/game-servers.service');

describe('GameServerAssignerService', () => {
  let service: GameServerAssignerService;
  let mongod: MongoMemoryServer;
  let gamesService: GamesService;
  let events: Events;
  let gameServersService: jest.Mocked<GameServersService>;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        mongooseTestingModule(mongod),
        MongooseModule.forFeature([{ name: Game.name, schema: gameSchema }]),
      ],
      providers: [
        GameServerAssignerService,
        GamesService,
        GameServersService,
        Events,
      ],
    }).compile();

    service = module.get<GameServerAssignerService>(GameServerAssignerService);
    gamesService = module.get(GamesService);
    events = module.get(Events);
    gameServersService = module.get(GameServersService);
  });

  beforeEach(() => {
    gameServersService.assignGameServer.mockImplementation(
      async (gameId, gameServerId) => {
        return await gamesService.update(gameId, {
          $set: {
            gameServer: {
              id: 'FAKE_GAMESERVER_ID',
              provider: 'test',
              name: 'FAKE GAMESERVER',
              address: '127.0.0.1',
              port: 27015,
            },
          },
        });
      },
    );
  });

  beforeEach(() => service.onModuleInit());

  afterEach(async () => {
    // @ts-expect-error
    await gamesService._reset();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('when a game is created', () => {
    let game: Game;

    beforeEach(async () => {
      // @ts-expect-error
      game = await gamesService._createOne();

      events.gameCreated.next({ game });
      await waitABit(500);
    });

    it('should assign it a gameserver', async () => {
      const newGame = await gamesService.getById(game.id);
      expect(newGame.gameServer).toEqual({
        id: 'FAKE_GAMESERVER_ID',
        provider: 'test',
        name: 'FAKE GAMESERVER',
        address: '127.0.0.1',
        port: 27015,
      });
    });
  });

  describe('#assignGameServer()', () => {
    let game: Game;

    beforeEach(async () => {
      // @ts-expect-error
      game = await gamesService._createOne();
    });

    it('should assign the given server', async () => {
      await service.assignGameServer(game.id, {
        id: 'FAKE_GAMESERVER_ID',
        provider: 'test',
      });
      expect(gameServersService.assignGameServer).toHaveBeenCalledWith(
        game.id,
        {
          id: 'FAKE_GAMESERVER_ID',
          provider: 'test',
        },
      );
    });

    describe('when a game is not in progress', () => {
      beforeEach(async () => {
        await gamesService.update(game.id, { state: GameState.ended });
      });

      it('should throw', async () => {
        await expect(
          service.assignGameServer(game.id, {
            id: 'FAKE_GAMESERVER_ID',
            provider: 'test',
          }),
        ).rejects.toThrow(GameInWrongStateError);
      });
    });

    describe('when the assign process fails', () => {
      beforeEach(() => {
        gameServersService.assignGameServer.mockRejectedValue('FAKE_ERROR');
      });

      it('should throw', async () => {
        await expect(
          service.assignGameServer(game.id, {
            id: 'FAKE_GAMESERVER_ID',
            provider: 'test',
          }),
        ).rejects.toThrow(CannotAssignGameServerError);
      });
    });
  });

  describe('#handleOrphanedGames()', () => {
    let game: Game;

    beforeEach(async () => {
      // @ts-expect-error
      game = await gamesService._createOne();

      // @ts-expect-error
      gamesService.getOrphanedGames.mockResolvedValue([game]);
    });

    it('should assign gameserver to orphaned games', async () => {
      await service.handleOrphanedGames();
      const newGame = await gamesService.getById(game.id);
      expect(newGame.gameServer).toEqual({
        id: 'FAKE_GAMESERVER_ID',
        provider: 'test',
        name: 'FAKE GAMESERVER',
        address: '127.0.0.1',
        port: 27015,
      });
    });
  });
});
