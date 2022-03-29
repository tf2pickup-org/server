import { app } from '@/app';
import { createRcon } from '@/utils/create-rcon';
import { plainToClass } from 'class-transformer';
import { ServemeTfGameServer } from './serveme-tf-game-server';

jest.mock('@/utils/create-rcon');
jest.mock('@/app', () => ({
  app: {
    get: jest.fn(),
  },
}));

describe('ServemeTfGameServer', () => {
  let gameServer: ServemeTfGameServer;

  beforeEach(() => {
    gameServer = plainToClass(ServemeTfGameServer, {
      provider: 'serveme.tf',
      id: 'FAKE_GAME_SERVER_ID',
      createdAt: new Date(),
      name: 'NewBrigade #16',
      address: 'FAKE_ADDRESS',
      port: '27015',
      reservation: {
        id: 42,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
        serverId: 128,
        password: 'FAKE_SERVER_PASSWORD',
        rcon: 'FAKE_RCON_PASSWORD',
        logsecret: 'FAKE_LOGSECRET',
        steamId: 'FAKE_STEAM_ID',
      },
    });
  });

  describe('#rcon()', () => {
    it('should create an rcon connection', async () => {
      await gameServer.rcon();
      expect(createRcon).toHaveBeenCalledWith({
        host: 'FAKE_ADDRESS',
        port: 27015,
        rconPassword: 'FAKE_RCON_PASSWORD',
      });
    });
  });

  describe('#getLogsecret()', () => {
    it('should return the reservation logsecret', async () => {
      const logsecret = await gameServer.getLogsecret();
      expect(logsecret).toEqual('FAKE_LOGSECRET');
    });
  });

  describe('#start()', () => {
    const servemeTfApiService = {
      waitForServerToStart: jest.fn().mockResolvedValue(null),
    };

    beforeEach(() => {
      (app as jest.Mocked<typeof app>).get.mockReturnValue(servemeTfApiService);
    });

    it('should wait for the server to start', async () => {
      await gameServer.start();
      expect(servemeTfApiService.waitForServerToStart).toHaveBeenCalledWith(42);
    });
  });
});
