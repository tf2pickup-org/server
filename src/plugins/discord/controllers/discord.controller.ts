import { Auth } from '@/auth/decorators/auth.decorator';
import { PlayerRole } from '@/players/models/player-role';
import { ClassSerializerInterceptor, Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { ChannelInfo } from '../dto/channel-info';
import { GuildInfo } from '../dto/guild-info';
import { DiscordService } from '../services/discord.service';

@Controller('discord')
@UseInterceptors(ClassSerializerInterceptor)
// @Auth(PlayerRole.admin)
export class DiscordController {
  constructor(
    private discordService: DiscordService,
  ) {}

  @Get('guilds')
  getGuilds(): GuildInfo[] {
    return this.discordService.getAllGuilds().map(g => new GuildInfo(g));
  }

  @Get('guilds/:guildId/text-channels')
  getTextChannels(@Param('guildId') guildId: string): ChannelInfo[] {
    return this.discordService.getTextChannelsForGuild(guildId).map(c => new ChannelInfo(c));
  }
}
