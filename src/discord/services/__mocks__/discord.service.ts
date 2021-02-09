import { Injectable } from '@nestjs/common';

let lastMessageId = 0;

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
      this._lastMessage = new Message();
      return Promise.resolve(this._lastMessage);
    }),
    messages: {
      fetch: jest.fn().mockResolvedValue({
        first: jest.fn().mockReturnValue(this._lastMessage),
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
