import { Injectable } from '@nestjs/common';

@Injectable()
export class DiscordService {

  adminsChannel = {
    send: () => Promise.resolve(),
  };

  getAdminsChannel() {
    return this.adminsChannel;
  }

}
