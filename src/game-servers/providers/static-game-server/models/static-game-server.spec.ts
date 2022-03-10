import { createRcon } from '@/utils/create-rcon';
import { Rcon } from 'rcon-client';
import { StaticGameServer } from './static-game-server';

jest.mock('../utils/generate-logsecret', () => ({
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

describe('StaticGameServer', () => {
  describe('#voiceChannelName', () => {
    describe('when the customVoiceChannelName is empty', () => {
      let gameServer: StaticGameServer;

      beforeEach(() => {
        gameServer = new StaticGameServer();
        gameServer.customVoiceChannelName = '';
        gameServer.name = 'tf2pickup.pl #1';
      });

      it('should derive the channel name from the gameserver name', async () => {
        expect(await gameServer.voiceChannelName()).toEqual('tf2pickup-pl-1');
      });
    });

    describe('when the customVoiceChannelName is not empty', () => {
      let gameServer: StaticGameServer;

      beforeEach(() => {
        gameServer = new StaticGameServer();
        gameServer.customVoiceChannelName = 'test_voice_channel';
      });

      it('should return the custom voice channel name', async () => {
        expect(await gameServer.voiceChannelName()).toEqual(
          'test_voice_channel',
        );
      });
    });
  });

  describe('#getLogsecret()', () => {
    let gameServer: StaticGameServer;
    let rcon: RconStub;

    beforeEach(() => {
      gameServer = new StaticGameServer();
      rcon = new RconStub();

      (createRcon as jest.MockedFunction<typeof createRcon>).mockResolvedValue(
        rcon as unknown as Rcon,
      );
    });

    it('should generate a logsecret', async () => {
      const logSecret = await gameServer.getLogsecret();
      expect(logSecret).toEqual('FAKE_LOGSECRET');
    });

    it('should set the logsecret on the gameserver', async () => {
      await gameServer.getLogsecret();
      expect(rcon.send).toHaveBeenCalledWith('sv_logsecret FAKE_LOGSECRET');
    });
  });
});
