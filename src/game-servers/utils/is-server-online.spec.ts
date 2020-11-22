import { isServerOnline } from './is-server-online';

describe('isServerOnline()', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('gamedig').__resetResult();
  });

  describe('when the queried server is online', () => {
    it('should resolve', async () => {
      await expect(isServerOnline('FAKE_ADDRESS', 27015)).resolves.toBe(true);
    });
  });

  describe('when the queried server if offline', () => {
    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('gamedig').__setResult(null);
    });

    it('should reject', async () => {
      await expect(isServerOnline('FAKE_ADDRESS', 27015)).resolves.toBe(false);
    });
  });
});
