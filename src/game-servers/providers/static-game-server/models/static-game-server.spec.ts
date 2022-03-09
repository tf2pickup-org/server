import { StaticGameServer } from './static-game-server';

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
});
