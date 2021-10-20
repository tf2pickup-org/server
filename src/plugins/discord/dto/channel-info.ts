import { GuildChannel } from "discord.js";

export class ChannelInfo {
  constructor(channel: GuildChannel) {
    this.id = channel.id;
    this.name = channel.name;
  }

  id: string;
  name: string;
}
