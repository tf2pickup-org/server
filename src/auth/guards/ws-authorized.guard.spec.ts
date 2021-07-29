import { WsAuthorizedGuard } from './ws-authorized.guard';

let client = {};

const context = {
  switchToWs: () => ({
    getClient: jest.fn().mockReturnValue(client),
  }),
};

describe('WsAuthorizedGuard', () => {
  it('should be defined', () => {
    expect(new WsAuthorizedGuard()).toBeDefined();
  });

  describe('when the user is not authenticated', () => {
    beforeEach(() => {
      client = {};
    });

    it('should deny', () => {
      const guard = new WsAuthorizedGuard();
      expect(() => guard.canActivate(context as any)).toThrowError(
        'unauthorized',
      );
    });
  });

  describe('when the user is authenticated', () => {
    beforeEach(() => {
      client = { user: {} };
    });

    it('should pass', () => {
      const guard = new WsAuthorizedGuard();
      expect(guard.canActivate(context as any)).toBe(true);
    });
  });
});
