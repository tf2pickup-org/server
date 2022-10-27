import { extractClientIp } from './extract-client-ip';

describe('extractClientIp', () => {
  it('should extract IP address from x-forwarded-for', () => {
    expect(
      extractClientIp({
        'x-forwarded-for': '192.168.0.1, 127.0.0.1',
      }),
    ).toEqual('192.168.0.1');
  });

  it('should extract IP address from x-real-ip', () => {
    expect(extractClientIp({ 'x-real-ip': '192.168.0.1' })).toEqual(
      '192.168.0.1',
    );
  });
});
