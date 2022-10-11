import { Test, TestingModule } from '@nestjs/testing';
import { GameRuntimeService } from './game-runtime.service';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { ServerConfiguratorService } from './server-configurator.service';
import { PlayersService } from '@/players/services/players.service';
import { say } from '../utils/rcon-commands';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import { Player, PlayerDocument, playerSchema } from '@/players/models/player';
import { Events } from '@/events/events';
import { getConnectionToken, MongooseModule } from '@nestjs/mongoose';
import { Connection, Error as MongooseError, Types } from 'mongoose';
import { Rcon } from 'rcon-client/lib';
import { GameDocument, Game, gameSchema } from '@/games/models/game';
import { GamesService } from '@/games/services/games.service';
import { GameServerControls } from '@/game-servers/interfaces/game-server-controls';
import { GameServerOptionWithProvider } from '@/game-servers/interfaces/game-server-option';
import { waitABit } from '@/utils/wait-a-bit';

jest.mock('@/games/services/games.service');
jest.mock('@/game-servers/services/game-servers.service');
jest.mock('./server-configurator.service');
jest.mock('@/players/services/players.service');
jest.mock('rcon-client/lib');

describe('GameRuntimeService', () => {
  let service: GameRuntimeService;
  let mongod: MongoMemoryServer;
  let playersService: PlayersService;
  let gamesService: GamesService;
  let gameServersService: jest.Mocked<GameServersService>;
  let serverConfiguratorService: jest.Mocked<ServerConfiguratorService>;
  let mockPlayers: PlayerDocument[];
  let mockGame: GameDocument;
  let events: Events;
  let connection: Connection;
  let controls: jest.Mocked<GameServerControls>;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        mongooseTestingModule(mongod),
        MongooseModule.forFeature([
          { name: Game.name, schema: gameSchema },
          { name: Player.name, schema: playerSchema },
        ]),
      ],
      providers: [
        GameRuntimeService,
        GamesService,
        GameServersService,
        ServerConfiguratorService,
        PlayersService,
        Events,
      ],
    }).compile();

    service = module.get<GameRuntimeService>(GameRuntimeService);
    playersService = module.get(PlayersService);
    gamesService = module.get(GamesService);
    gameServersService = module.get(GameServersService);
    serverConfiguratorService = module.get(ServerConfiguratorService);
    events = module.get(Events);
    connection = module.get(getConnectionToken());
  });

  beforeEach(async () => {
    mockPlayers = await Promise.all([
      // @ts-expect-error
      playersService._createOne(),
      // @ts-expect-error
      playersService._createOne(),
    ]);

    // @ts-expect-error
    mockGame = await gamesService._createOne(mockPlayers);

    mockGame.gameServer = {
      provider: 'test',
      id: 'FAKE_GAMESERVER',
      name: 'FAKE GAMESERVER',
      address: 'localhost',
      port: 27015,
    };
    await mockGame.save();

    serverConfiguratorService.configureServer.mockResolvedValue({
      connectString: 'FAKE_CONNECT_STRING',
      stvConnectString: 'FAKE_STV_CONNECT_STRING',
    });

    controls = {
      start: jest.fn(),
      rcon: jest.fn(),
      getLogsecret: jest.fn().mockResolvedValue('FAKE_LOGSECRET'),
    };
    gameServersService.getControls.mockResolvedValue(controls);
  });

  beforeEach(() => {
    service.onModuleInit();
  });

  afterEach(async () => {
    // @ts-expect-error
    await gamesService._reset();
    // @ts-expect-error
    await playersService._reset();
    await connection.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('when the substituteRequested event is emitted', () => {
    let rcon: jest.Mocked<Rcon>;

    beforeEach(async () => {
      rcon = new (Rcon as any)();
      controls.rcon.mockResolvedValue(rcon);

      events.substituteRequested.next({
        gameId: mockGame.id,
        playerId: mockPlayers[0].id,
      });
      await waitABit(100);
    });

    it('should send an in-game notification', () => {
      expect(rcon.send).toHaveBeenCalledWith(
        'say Looking for replacement for fake_player_1...',
      );
    });
  });

  describe('when the gameReconfigureRequested event is emitted', () => {
    beforeEach(async () => {
      events.gameReconfigureRequested.next({ gameId: mockGame.id });
      await waitABit(100);
    });

    it('should reconfigure the server', () => {
      expect(serverConfiguratorService.configureServer).toHaveBeenCalledWith(
        mockGame.id,
      );
    });
  });

  describe('#reconfigure()', () => {
    it('should configure the server again', async () => {
      const ret = await service.reconfigure(mockGame.id);
      expect(serverConfiguratorService.configureServer).toHaveBeenCalledWith(
        mockGame.id,
      );
      expect(ret.connectString).toEqual('FAKE_CONNECT_STRING');
    });

    it('should bump connect info version', async () => {
      const v = mockGame.connectInfoVersion;
      const ret = await service.reconfigure(mockGame.id);
      expect(ret.connectInfoVersion > v).toBe(true);
    });

    describe('when the given game does not exist', () => {
      it('should throw an error', async () => {
        await expect(
          service.reconfigure(new Types.ObjectId().toString()),
        ).rejects.toThrow(MongooseError.DocumentNotFoundError);
      });
    });

    describe('when the game has no game server assigned', () => {
      let anotherGame: GameDocument;

      beforeEach(async () => {
        // @ts-expect-error
        anotherGame = await gamesService._createOne(mockPlayers);
      });

      it('should throw an error', async () => {
        await expect(service.reconfigure(anotherGame.id)).rejects.toThrow(
          'this game has no server assigned',
        );
      });
    });

    describe('when an rcon error occurs', () => {
      beforeEach(() => {
        serverConfiguratorService.configureServer.mockRejectedValue(
          new Error('FAKE_RCON_ERROR'),
        );
      });

      it('should handle the error', async () => {
        await expect(service.reconfigure(mockGame.id)).resolves.toBeTruthy();
      });
    });
  });

  describe('#replacePlayer()', () => {
    let rcon: jest.Mocked<Rcon>;

    beforeEach(() => {
      rcon = new (Rcon as any)();
      controls.rcon.mockResolvedValue(rcon);
    });

    describe('when the given game does not exist', () => {
      it('should throw an error', async () => {
        await expect(
          service.replacePlayer(
            new Types.ObjectId().toString(),
            'FAKE_REPLACEE_ID',
            null,
          ),
        ).rejects.toThrow(MongooseError.DocumentNotFoundError);
      });
    });

    describe('when the given game has no game server assigned', () => {
      let anotherGame: GameDocument;

      beforeEach(async () => {
        // @ts-expect-error
        anotherGame = await gamesService._createOne(mockPlayers);
      });

      it('should not throw an error', async () => {
        await expect(
          service.replacePlayer(
            anotherGame.id,
            mockPlayers[0].id,
            mockPlayers[1].id,
          ),
        ).resolves.not.toThrow();
      });
    });

    it.todo('should execute the correct commands');

    describe('when an rcon error occurs', () => {
      beforeEach(() => {
        rcon.send.mockRejectedValue(new Error('fake rcon error'));
      });

      it('should close the RCON connection', async () => {
        await service.replacePlayer(
          mockGame.id,
          mockPlayers[0].id,
          mockPlayers[1].id,
        );
        expect(rcon.end).toHaveBeenCalled();
      });
    });

    it('should close the RCON connection', async () => {
      const spy = jest.spyOn(rcon, 'end');
      await service.replacePlayer(
        mockGame.id,
        mockPlayers[0].id,
        mockPlayers[1].id,
      );
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('#sayChat()', () => {
    let rcon: jest.Mocked<Rcon>;
    let gameServer: GameServerOptionWithProvider;

    beforeEach(() => {
      gameServer = {
        id: 'FAKE_GAME_SERVER',
        provider: 'test',
        name: 'FAKE GAME SERVER',
        address: 'localhost',
        port: 27015,
      };
      rcon = new (Rcon as any)();
      controls.rcon.mockResolvedValue(rcon);
    });

    it('should execute the correct commands', async () => {
      await service.sayChat(gameServer, 'some message');
      expect(rcon.send).toHaveBeenCalledWith(say('some message'));
    });

    describe('when an rcon error occurs', () => {
      beforeEach(() => {
        rcon.send.mockRejectedValue(new Error('fake rcon error'));
      });

      it('should close the RCON connection', async () => {
        await service.sayChat(gameServer, 'some message');
        expect(rcon.end).toHaveBeenCalled();
      });
    });
  });
});
