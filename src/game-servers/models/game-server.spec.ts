import { NotImplementedError } from '../errors/not-implemented.error';
import { GameServer } from './game-server';

describe('GameServer', () => {
  describe('#getLogsecret()', () => {
    it('should throw an error', async () => {
      const gameServer = new GameServer();
      await expect(gameServer.getLogsecret()).rejects.toThrow(
        NotImplementedError,
      );
    });
  });
});
