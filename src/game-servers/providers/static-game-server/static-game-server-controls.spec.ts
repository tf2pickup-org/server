import { Types } from 'mongoose';
import { StaticGameServer } from './models/static-game-server';
import { StaticGameServerControls } from './static-game-server-controls';
import { createRcon } from '@/utils/create-rcon';
import { Rcon } from 'rcon-client';

jest.mock('./utils/generate-logsecret', () => ({
  generateLogsecret: jest.fn().mockReturnValue('FAKE_LOGSECRET'),
}));

jest.mock('rcon-client', () => ({
  Rcon: jest.fn().mockImplementation(function () {
    return {
      send: jest.fn().mockResolvedValue(this),
      end: jest.fn().mockResolvedValue(this),
    };
  }),
}));

jest.mock('@/utils/create-rcon');

class RconStub {
  send = jest.fn();
  end = jest.fn();
}

describe('StaticGameServerControls', () => {
  let controls: StaticGameServerControls;
  let gameServer: StaticGameServer;

  beforeEach(() => {
    gameServer = new StaticGameServer();
    gameServer.id = new Types.ObjectId().toString();
    gameServer.createdAt = new Date();
    gameServer.name = 'FAKE_GAMESERVER';
    gameServer.address = 'localhost';
    gameServer.port = '27015';
    gameServer.internalIpAddress = 'localhost';
    gameServer.rconPassword = 'FAKE_RCON_PASSWORD';
    gameServer.isOnline = true;
    gameServer.lastHeartbeatAt = new Date();
    gameServer.priority = 1;

    controls = new StaticGameServerControls(gameServer);
  });

  describe('#getLogsecret()', () => {
    let rcon: RconStub;

    beforeEach(() => {
      rcon = new RconStub();

      (createRcon as jest.MockedFunction<typeof createRcon>).mockResolvedValue(
        rcon as unknown as Rcon,
      );
    });

    it('should generate a logsecret', async () => {
      const logSecret = await controls.getLogsecret();
      expect(logSecret).toEqual('FAKE_LOGSECRET');
    });

    it('should set the logsecret on the gameserver', async () => {
      await controls.getLogsecret();
      expect(rcon.send).toHaveBeenCalledWith('sv_logsecret FAKE_LOGSECRET');
    });
  });
});
