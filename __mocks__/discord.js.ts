import { EventEmitter } from 'events';

const { Collection, EmbedBuilder, GatewayIntentBits, ChannelType } =
  jest.requireActual('discord.js');

export class Message {
  static _lastMessageId = 1;

  id = `${++Message._lastMessageId}`;
  edit = jest.fn();
}

export class GuildMessageManager {
  cache = new Collection();

  resolve = jest
    .fn()
    .mockImplementation((resolvable) => this.cache.get(resolvable));
  fetch = jest
    .fn()
    .mockImplementation((resolvable) =>
      Promise.resolve(this.cache.get(resolvable)),
    );
}

export class TextChannel {
  constructor(public name: string) {}

  guildId?: string;

  isTextBased = jest.fn().mockReturnValue(true);
  type = ChannelType.GuildText;
  messages = new GuildMessageManager();

  send = jest.fn().mockImplementation(() => {
    const message = new Message();
    this.messages.cache.set(message.id, message);
    return Promise.resolve(message);
  });
}

export class ChannelManager {
  cache = new Collection();

  resolve = jest
    .fn()
    .mockImplementation((resolvable) => this.cache.get(resolvable));
  fetch = jest
    .fn()
    .mockImplementation((resolvable) =>
      Promise.resolve(this.cache.get(resolvable)),
    );
}

export class RoleManager {
  cache = new Collection();

  resolve = jest
    .fn()
    .mockImplementation((resolvable) => this.cache.get(resolvable));
}

export class Role {
  constructor(public name: string) {}

  mentionable = true;

  toString() {
    return `&<${this.name}>`;
  }
}

export const pickupsRole = new Role('pickups');

export class Guild {
  constructor(
    public readonly id: string,
    public name: string,
  ) {}

  available = true;

  channels = new ChannelManager();
  roles = new RoleManager();

  emojis = {
    cache: new Collection([]),
    create: jest.fn().mockImplementation(({ attachment, name }) => {
      const emoji = { name, toString: () => `<emoji:${name}>` };
      this.emojis.cache.set(name, emoji);
      return Promise.resolve(emoji);
    }),
  };
}

export class GuildManager {
  cache = new Collection();

  resolve = jest
    .fn()
    .mockImplementation((resolvable) => this.cache.get(resolvable));
}

export class Client extends EventEmitter {
  static _instance: Client;

  user = { tag: 'bot#1337' };
  guilds = new GuildManager();

  channels = new ChannelManager();

  constructor(public readonly options: any) {
    super();
    Client._instance = this;
    this.guilds.cache.set('guild1', new Guild('guild1', 'FAKE_GUILD'));
  }

  login(token: string) {
    return Promise.resolve('FAKE_TOKEN');
  }
}

export { ChannelType, EmbedBuilder, GatewayIntentBits };
