import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client, Guild, TextChannel } from 'discord.js';
import { Environment } from '@/environment/environment';
import { ConfigurationService } from '@/configuration/services/configuration.service';

@Injectable()
export class DiscordService implements OnModuleInit {
  private client = new Client();
  private logger = new Logger(DiscordService.name);

  constructor(
    private environment: Environment,
    private configurationService: ConfigurationService,
  ) {}

  onModuleInit() {
    if (this.environment.discordBotToken) {
      this.client.on('ready', () => {
        this.logger.log(`logged in as ${this.client.user.tag}`);
      });

      this.client
        .login(this.environment.discordBotToken)
        .catch((error) => this.logger.error(error.toString()));
    }
  }

  getAllGuilds(): Guild[] {
    return [...this.client.guilds.cache.values()];
  }

  getTextChannelsForGuild(guildId: string): TextChannel[] {
    const guild = this.client.guilds.cache.get(guildId);
    return Array.from(
      guild.channels.cache
        .filter((c) => c.isText())
        .filter((c) => !c.deleted)
        .values(),
    ) as TextChannel[];
  }

  async getEnabledGuilds(): Promise<Guild[]> {
    const guildIds = (await this.configurationService.getDiscord()).servers.map(
      (server) => server.guildId,
    );
    return this.getAllGuilds().filter((guild) => guildIds.includes(guild.id));
  }

  /**
   * Get channels for admins' notifications for all enabled guilds.
   */
  async getAdminsChannels(): Promise<TextChannel[]> {
    return (await this.configurationService.getDiscord()).servers
      .map((server) => {
        if (server.adminNotificationsChannelId) {
          const guild = this.client.guilds.cache.get(server.guildId);
          return guild.channels.cache
            .filter((c) => c.isText())
            .find(
              (c) => c.id === server.adminNotificationsChannelId,
            ) as TextChannel;
        } else {
          return null;
        }
      })
      .filter((c) => c !== null);
  }

  /**
   * Get channels for queue notifications (join queue prompts, substitute requests) for all enabled guilds.
   */
  async getQueueNotificationsChannels(): Promise<TextChannel[]> {
    return (await this.configurationService.getDiscord()).servers
      .map((server) => {
        if (server.queueNotificationsChannelId) {
          const guild = this.client.guilds.cache.get(server.guildId);
          return guild.channels.cache
            .filter((c) => c.isText())
            .find(
              (c) => c.id === server.queueNotificationsChannelId,
            ) as TextChannel;
        } else {
          return null;
        }
      })
      .filter((c) => c !== null);
  }
}
