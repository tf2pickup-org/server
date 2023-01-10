jest.mock('@tf2pickup-org/mumble-client');
import { MumbleBot } from './mumble-bot';
import { Client as MockClient } from '@mocks/@tf2pickup-org/mumble-client';
import { Game } from '@/games/models/game';

describe('MumbleBot', () => {
  let mumbleBot: MumbleBot;
  let client: MockClient;

  beforeEach(() => {
    mumbleBot = new MumbleBot({
      host: 'FAKE_HOST',
      port: 1234,
      username: 'FAKE_USERNAME',
      password: 'FAKE_PASSWORD',
      clientName: 'FAKE_CLIENT_NAME',
      certificate: {
        id: 'FAKE_CERT_ID',
        purpose: 'mumble',
        clientKey: 'FAKE_KEY',
        certificate: 'FAKE_CERTIFICATE',
      },
      targetChannelName: 'FAKE_CHANNEL_NAME',
    });

    client = MockClient._lastInstance;
  });

  it('should create', () => {
    expect(mumbleBot).toBeTruthy();
  });

  describe('#connect()', () => {
    beforeEach(async () => {
      await mumbleBot.connect();
    });

    it('should call client.connect()', () => {
      expect(client.connect).toHaveBeenCalledTimes(1);
    });

    it('should self-deafen', () => {
      expect(client.user.setSelfDeaf).toHaveBeenCalledWith(true);
    });

    describe('#disconnect()', () => {
      beforeEach(() => {
        mumbleBot.disconnect();
      });

      it('should call client.disconnect()', () => {
        expect(client.disconnect).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('#setupChannels()', () => {
    let game: Game;

    beforeEach(() => {
      game = new Game();
      game.id = 'FAKE_GAME_ID';
      game.number = 1;
    });

    it('should create subchannels', async () => {
      await mumbleBot.setupChannels(game);
      expect(client.user.channel.subChannels[0].name).toBe('1');
      expect(client.user.channel.subChannels[0].subChannels[0].name).toBe(
        'BLU',
      );
      expect(client.user.channel.subChannels[0].subChannels[1].name).toBe(
        'RED',
      );
    });

    describe('if moved to another channel', () => {
      beforeEach(async () => {
        await client.user.moveToChannel(128);
      });

      it('should move back to the right channel', async () => {
        await mumbleBot.setupChannels(game);
        expect(client.user.channel.id).toBe(0);
        expect(client.user.channel.subChannels[0].name).toBe('1');
      });
    });
  });

  describe('#linkChannels()', () => {
    let game: Game;

    beforeEach(async () => {
      game = new Game();
      game.id = 'FAKE_GAME_ID';
      game.number = 2;

      const ch = await client.user.channel.createSubChannel('2');
      await ch.createSubChannel('BLU');
      await ch.createSubChannel('RED');
    });

    it('should link channels', async () => {
      await mumbleBot.linkChannels(game);
      const red = client.user.channel.subChannels[0].subChannels[1];
      expect(red.link).toHaveBeenCalled();
      expect(red.links.length).toBe(1);
    });
  });
});
