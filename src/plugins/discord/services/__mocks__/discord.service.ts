import { Injectable } from '@nestjs/common';

let lastMessageId = 0;

const messages = new Map<number, Message>();

class Message {
  id = ++lastMessageId;
  delete = jest.fn().mockResolvedValue(this);
  edit = jest.fn().mockResolvedValue(this);
}

@Injectable()
export class DiscordService {
  _lastMessage = null;

  playersChannel = {
    send: jest.fn().mockImplementation(() => {
      const message = new Message();
      messages.set(message.id, message);
      this._lastMessage = message;
      return Promise.resolve(message);
    }),
    messages: {
      fetch: jest.fn().mockImplementation((params) => {
        if (typeof params === 'number') {
          return Promise.resolve(messages.get(params));
        } else if (typeof params === 'object') {
          return Promise.resolve({
            first: jest.fn().mockReturnValue(this._lastMessage),
          });
        }
      }),
    },
  };

  adminsChannel = {
    send: jest.fn().mockImplementation(() => {
      this._lastMessage = new Message();
      return Promise.resolve(this._lastMessage);
    }),
  };

  getPlayersChannel() {
    return this.playersChannel;
  }

  getAdminsChannel() {
    return this.adminsChannel;
  }

  findRole(role: string) {
    return {
      mentionable: true,
      toString: () => `&<${role}>`,
    };
  }

  findEmoji(name: string) {
    return `<emoji:${name}>`;
  }
}
