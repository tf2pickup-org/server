import { Guild } from "discord.js";

export class GuildInfo {
  constructor(guild: Guild) {
    this.id = guild.id;
    this.name = guild.name;
    this.icon = guild.iconURL({ format: 'webp' });
  }

  id: string;
  name: string;
  icon: string;
}
