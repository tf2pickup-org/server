import { Controller, Get, Param } from '@nestjs/common';
import { DiscordService } from '../services/discord.service';

@Controller('discord')
export class DiscordController {
  constructor(private readonly discordService: DiscordService) {}

  @Get('guilds')
  getGuilds() {
    return this.discordService
      .getGuilds()
      .map((guild) => ({ id: guild.id, name: guild.name }));
  }

  @Get('guilds/:id/text-channels')
  getTextChannels(@Param('id') guildId: string) {
    return this.discordService.getTextChannels(guildId)?.map((channel) => ({
      id: channel.id,
      name: channel.name,
      position: channel.position,
      parent: channel.parent?.name,
    }));
  }

  @Get('guilds/:id/roles')
  getRoles(@Param('id') guildId: string) {
    return this.discordService.getRoles(guildId).map((role) => ({
      id: role.id,
      name: role.name,
      position: role.position,
    }));
  }
}
