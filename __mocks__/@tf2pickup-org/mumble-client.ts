class MockChannel {
  id = 0;
  name = '';
  subChannels: MockChannel[] = [];
  links: MockChannel[] = [];
  users: MockUser[] = [];
  parent: MockChannel | undefined = undefined;

  getPermissions = jest.fn().mockResolvedValue({
    canJoinChannel: true,
    canCreateChannel: true,
    canRemoveChannel: true,
    canLinkChannel: true,
  });

  createSubChannel = jest.fn().mockImplementation((name) => {
    const channel = new MockChannel();
    channel.name = name;
    channel.parent = this;
    this.subChannels.push(channel);
    return Promise.resolve(channel);
  });

  link = jest.fn().mockImplementation((otherChannel) => {
    this.links.push(otherChannel);
    return Promise.resolve(this);
  });

  remove = jest.fn().mockImplementation(() => {
    const index = this.parent?.subChannels.indexOf(this);
    if (index && index !== -1) {
      this.parent?.subChannels.splice(index, 1);
    }
  });
}

class MockChannelManager {
  byId = jest.fn().mockImplementation((channelId) => {
    const channel = new MockChannel();
    channel.id = channelId;
    return channel;
  });

  byName = jest.fn().mockImplementation((channelName) => {
    const channel = new MockChannel();
    channel.name = channelName;
    return channel;
  });
}

export class MockUser {
  channel = new MockChannel();

  moveToChannel = jest.fn().mockImplementation((channelId: number) => {
    this.channel.id = channelId;
  });

  setSelfMute = jest.fn().mockResolvedValue(this);
  setSelfDeaf = jest.fn().mockResolvedValue(this);

  name = 'mock user';
}

class MockUserManager {}

export class Client {
  static _lastInstance: Client;
  channels = new MockChannelManager();
  users = new MockUserManager();
  user = new MockUser();
  welcomeText = 'FAKE_WELCOME_TEXT';

  constructor(public options: any) {
    Client._lastInstance = this;
  }

  connect = jest.fn().mockResolvedValue(this);
  disconnect = jest.fn();
}
