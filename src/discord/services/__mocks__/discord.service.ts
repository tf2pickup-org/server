import { Injectable } from '@nestjs/common';

class Message {
  delete() { return Promise.resolve(this); }
}

@Injectable()
export class DiscordService {

  playersChannel = {
    send: () => Promise.resolve(new Message()),
  };

  adminsChannel = {
    send: () => Promise.resolve(new Message()),
  };

  getPlayersChannel() {
    return this.playersChannel;
  }

  getAdminsChannel() {
    return this.adminsChannel;
  }

  findRole(role: string) {
    return `&<${role}>`;
  }

}
