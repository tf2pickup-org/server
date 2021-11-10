import { GuildChannel } from "discord.js";

export class ChannelInfo {
  constructor(channel: GuildChannel) {
    this.id = channel.id;
    this.name = channel.name;
    this.position = channel.position;
  }

  id: string;
  name: string;
  position: number;
}
