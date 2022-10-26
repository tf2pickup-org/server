import { Environment } from '@/environment/environment';
import { Events } from '@/events/events';
import { GameServerControls } from '@/game-servers/interfaces/game-server-controls';
import { GameServersService } from '@/game-servers/services/game-servers.service';
import { Game } from '@/games/models/game';
import { GameServer } from '@/games/models/game-server';
import { GameState } from '@/games/models/game-state';
import { waitABit } from '@/utils/wait-a-bit';
import { Test, TestingModule } from '@nestjs/testing';
import { Rcon } from 'rcon-client/lib';
import {
  delAllGamePlayers,
  disablePlayerWhitelist,
  logAddressDel,
} from '../utils/rcon-commands';
import { ServerCleanupService } from './server-cleanup.service';

jest.mock('@/environment/environment');
jest.mock('@/game-servers/services/game-servers.service');

const environmentStub = {
  logRelayAddress: 'FAKE_RELAY_ADDRESS',
  logRelayPort: '1234',
};

describe('ServerCleanupService', () => {
  let service: ServerCleanupService;
  let events: Events;
  let gameServersService: jest.Mocked<GameServersService>;
  let controls: jest.Mocked<GameServerControls>;
  let rcon: jest.Mocked<Rcon>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServerCleanupService,
        { provide: Environment, useValue: environmentStub },
        Events,
        GameServersService,
      ],
    }).compile();

    service = module.get<ServerCleanupService>(ServerCleanupService);
    events = module.get(Events);
    gameServersService = module.get(GameServersService);
  });

  beforeEach(() => {
    rcon = {
      send: jest.fn(),
      end: jest.fn(),
    } as unknown as jest.Mocked<Rcon>;

    controls = {
      start: jest.fn(),
      rcon: jest.fn().mockResolvedValue(rcon),
      getLogsecret: jest.fn(),
    };

    gameServersService.getControls.mockResolvedValue(controls);
  });

  beforeEach(() => {
    service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('when the gameserver is unassigned', () => {
    let gameServer: GameServer;

    beforeEach(async () => {
      gameServer = new GameServer();
      gameServer.id = 'FAKE_GAMESERVER_ID';
      gameServer.provider = 'fake';
      gameServer.name = 'FAKE GAMESERVER';
      gameServer.address = 'localhost';
      gameServer.port = 27015;

      const oldGame = new Game();
      oldGame.id = 'FAKE_GAME_ID';
      oldGame.state = GameState.launching;
      oldGame.gameServer = gameServer;

      const newGame = new Game();
      newGame.id = oldGame.id;
      newGame.state = oldGame.state;

      events.gameChanges.next({
        oldGame,
        newGame,
      });

      await waitABit(100);
    });

    it('should clean the server up', () => {
      expect(rcon.send).toHaveBeenCalledWith(
        logAddressDel('FAKE_RELAY_ADDRESS:1234'),
      );
      expect(rcon.send).toHaveBeenCalledWith(delAllGamePlayers());
      expect(rcon.send).toHaveBeenCalledWith(disablePlayerWhitelist());
    });
  });

  describe('when the game ends', () => {
    let gameServer: GameServer;

    beforeEach(() => {
      jest.useFakeTimers();

      gameServer = new GameServer();
      gameServer.id = 'FAKE_GAMESERVER_ID';
      gameServer.provider = 'fake';
      gameServer.name = 'FAKE GAMESERVER';
      gameServer.address = 'localhost';
      gameServer.port = 27015;

      const oldGame = new Game();
      oldGame.id = 'FAKE_GAME_ID';
      oldGame.gameServer = gameServer;
      oldGame.state = GameState.started;

      const newGame = new Game();
      newGame.id = oldGame.id;
      newGame.gameServer = gameServer;
      newGame.state = GameState.ended;

      events.gameChanges.next({
        oldGame,
        newGame,
      });

      jest.advanceTimersByTime(30 * 1000);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should clean the server up', () => {
      expect(rcon.send).toHaveBeenCalledWith(
        logAddressDel('FAKE_RELAY_ADDRESS:1234'),
      );
      expect(rcon.send).toHaveBeenCalledWith(delAllGamePlayers());
      expect(rcon.send).toHaveBeenCalledWith(disablePlayerWhitelist());
    });
  });

  describe('when the game is force-ended', () => {
    let gameServer: GameServer;

    beforeEach(async () => {
      gameServer = new GameServer();
      gameServer.id = 'FAKE_GAMESERVER_ID';
      gameServer.provider = 'fake';
      gameServer.name = 'FAKE GAMESERVER';
      gameServer.address = 'localhost';
      gameServer.port = 27015;

      const oldGame = new Game();
      oldGame.id = 'FAKE_GAME_ID';
      oldGame.gameServer = gameServer;
      oldGame.state = GameState.started;

      const newGame = new Game();
      newGame.id = oldGame.id;
      newGame.gameServer = gameServer;
      newGame.state = GameState.interrupted;

      events.gameChanges.next({
        oldGame,
        newGame,
      });

      await waitABit(100);
    });

    it('should clean the server up', () => {
      expect(rcon.send).toHaveBeenCalledWith(
        logAddressDel('FAKE_RELAY_ADDRESS:1234'),
      );
      expect(rcon.send).toHaveBeenCalledWith(delAllGamePlayers());
      expect(rcon.send).toHaveBeenCalledWith(disablePlayerWhitelist());
    });
  });

  describe('when an rcon error occurs', () => {
    let gameServer: GameServer;

    beforeEach(() => {
      gameServer = new GameServer();
      gameServer.id = 'FAKE_GAMESERVER_ID';
      gameServer.provider = 'fake';
      gameServer.name = 'FAKE GAMESERVER';
      gameServer.address = 'localhost';
      gameServer.port = 27015;

      rcon.send.mockRejectedValue('FAKE_RCON_ERROR');
    });

    it('should handle the error', async () => {
      await expect(service.cleanupServer(gameServer)).resolves.not.toThrow();
    });

    it('should close the rcon connection', async () => {
      await service.cleanupServer(gameServer);
      expect(rcon.end).toHaveBeenCalled();
    });
  });
});
