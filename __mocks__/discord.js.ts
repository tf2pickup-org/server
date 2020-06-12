import { EventEmitter } from 'events';
import { Collection } from '../node_modules/discord.js/src';

export class Message { }

export class TextChannel {
  constructor(public name: string) { }
  send(message: string) { return Promise.resolve(new Message()); }
}

export const playersChannel = new TextChannel('players');
export const adminChannel = new TextChannel('admins');

export class Role {
  constructor(public name: string) { }

  mentionable = true;

  toString() {
    return `&<${this.name}>`;
  }
}

export const pickupsRole = new Role('pickups');

export class Guild {
  constructor(public name: string) { }

  available = true;

  channels = {
    cache: new Collection([
      [ 'queue', playersChannel ],
      [ 'players', adminChannel ],
    ]),
  };

  roles = {
    cache: new Collection([
      [ 'pickups', pickupsRole ],
    ]),
  };
}

export class Client extends EventEmitter {

  static _instance: Client;

  user = { tag: 'bot#1337' };
  guilds = {
    cache: new Collection([ [ 'guild1', new Guild('FAKE_GUILD') ] ]),
  }

  constructor() {
    super();
    Client._instance = this;
  }

  login(token: string) { return Promise.resolve('FAKE_TOKEN'); }

}

export { MessageEmbed } from '../node_modules/discord.js/src';
