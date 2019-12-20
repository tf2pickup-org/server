import { WsAuthorizedGuard } from './ws-authorized.guard';

const user = {
  logged_in: false,
};

const context = {
  switchToWs: () => ({
    getClient: () => ({
      request: { user },
    }),
  }),
};

describe('WsAuthorizedGuard', () => {
  it('should be defined', () => {
    expect(new WsAuthorizedGuard()).toBeDefined();
  });

  it('should deny if the user is not authenticated', () => {
    user.logged_in = false;
    const guard = new WsAuthorizedGuard();
    expect(guard.canActivate(context as any)).toBe(false);
  });

  it('should pass if the user is authenticated', () => {
    user.logged_in = true;
    const guard = new WsAuthorizedGuard();
    expect(guard.canActivate(context as any)).toBe(true);
  });
});
