import { Types } from 'mongoose';
import { ServemeTfGameServer } from './models/serveme-tf-game-server';
import { ServemeTfServerControls } from './serveme-tf-server-controls';
import { ServemeTfApiService } from './services/serveme-tf-api.service';
import { createRcon } from '@/utils/create-rcon';

jest.mock('./services/serveme-tf-api.service');
jest.mock('@/utils/create-rcon');

describe('ServemeTfServerControls', () => {
  let controls: ServemeTfServerControls;
  let gameServer: ServemeTfGameServer;
  let servemeTfApiService: jest.Mocked<ServemeTfApiService>;

  beforeEach(() => {
    gameServer = new ServemeTfGameServer();
    gameServer.id = new Types.ObjectId().toString();
    gameServer.name = 'BolusBrigade #04';
    gameServer.address = 'bolus.fakkelbrigade.eu';
    gameServer.port = '27045';
    gameServer.reservation = {
      id: 1251216,
      startsAt: new Date(),
      endsAt: new Date(),
      serverId: 299,
      password: 'FAKE_PASSWORD',
      rcon: 'FAKE_RCON_PASSWORD',
      logsecret: 'FAKE_LOGSECRET',
      steamId: 'FAKE_STEAM_ID',
    };

    servemeTfApiService = new ServemeTfApiService(
      null,
      null,
      null,
    ) as jest.Mocked<ServemeTfApiService>;

    controls = new ServemeTfServerControls(gameServer, servemeTfApiService);
  });

  describe('#start()', () => {
    it('should wait for the server to start', async () => {
      await controls.start();
      expect(servemeTfApiService.waitForServerToStart).toHaveBeenCalledWith(
        1251216,
      );
    });
  });

  describe('#rcon()', () => {
    it('should create an rcon connection', async () => {
      await controls.rcon();
      expect(createRcon).toHaveBeenCalledWith({
        host: 'bolus.fakkelbrigade.eu',
        port: 27045,
        rconPassword: 'FAKE_RCON_PASSWORD',
      });
    });
  });

  describe('#getLogsecret()', () => {
    it('should return the reservation logsecret', async () => {
      const logsecret = await controls.getLogsecret();
      expect(logsecret).toEqual('FAKE_LOGSECRET');
    });
  });
});
