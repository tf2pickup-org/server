import { Injectable } from '@nestjs/common';

@Injectable()
export class DiscordService {

  playersChannel = {
    send: () => Promise.resolve(),
  };

  adminsChannel = {
    send: () => Promise.resolve(),
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
