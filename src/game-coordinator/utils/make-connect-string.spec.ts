import { makeConnectString } from './make-connect-string';

describe('makeConnectString()', () => {
  describe('without password', () => {
    it('should create connect string', () => {
      expect(
        makeConnectString({
          address: 'FAKE_ADDRESS',
          port: 27015,
        }),
      ).toEqual('connect FAKE_ADDRESS:27015');

      expect(
        makeConnectString({
          address: 'FAKE_ADDRESS',
          port: 27015,
          password: '',
        }),
      ).toEqual('connect FAKE_ADDRESS:27015');
    });
  });

  describe('with password', () => {
    it('should create connect string', () => {
      expect(
        makeConnectString({
          address: 'FAKE_ADDRESS',
          port: 27015,
          password: 'FAKE_PASSWORD',
        }),
      ).toEqual('connect FAKE_ADDRESS:27015; password FAKE_PASSWORD');
    });
  });
});
