import { toValidMumbleChannelName } from './to-valid-mumble-channel-name';

describe('when the name contains whitespaces', () => {
  it('should replace them with dashes', () => {
    expect(toValidMumbleChannelName('a b  c')).toEqual('a-b-c');
  });
});

describe('when the name contains dots', () => {
  it('should replace them with dashes', () => {
    expect(toValidMumbleChannelName('tf2pickup.org')).toEqual('tf2pickup-org');
  });
});

describe('when the name contains hashes', () => {
  it('should remove them', () => {
    expect(toValidMumbleChannelName('melkor #1')).toEqual('melkor-1');
  });
});
