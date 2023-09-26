import { Inject, Injectable } from '@nestjs/common';
import { ChannelType, Client, TextChannel } from 'discord.js';

@Injectable()
export class DiscordService {
  constructor(@Inject('DISCORD_CLIENT') private readonly client: Client) {}

  getGuilds() {
    return this.client.guilds.cache;
  }

  getTextChannels(guildId: string): TextChannel[] {
    return Array.from(
      (
        this.client.guilds.cache
          .get(guildId)
          ?.channels.cache.filter(
            (channel) => channel.type === ChannelType.GuildText,
          ) as Map<string, TextChannel>
      ).values() ?? [],
    );
  }
}
