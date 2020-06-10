import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client, Guild, TextChannel } from 'discord.js';
import { Environment } from '@/environment/environment';

@Injectable()
export class DiscordService implements OnModuleInit {

  private client = new Client();
  private guild: Guild;
  private logger = new Logger(DiscordService.name);

  constructor(
    private environment: Environment,
  ) { }

  onModuleInit() {
    if (this.environment.discordBotToken) {
      this.client.on('ready', () => {
        this.logger.log(`logged in as ${this.client.user.tag}`);
        this.enable();
      });

      this.client.login(this.environment.discordBotToken)
        .catch(error => this.logger.error(error.toString()));
    }
  }

  getAdminsChannel(): TextChannel {
    return this.findChannel(this.environment.discordAdminNotificationsChannel);
  }

  private enable() {
    this.guild = this.client.guilds.cache.find(guild => guild.name === this.environment.discordGuild);
    if (!this.guild?.available) {
      this.logger.warn(`guild '${this.environment.discordGuild}' is not available; discord notifications will not work`);
    }
  }

  private findChannel(name: string) {
    return this.guild.channels.cache
      .filter(c => c instanceof TextChannel)
      .find(c => (c as TextChannel).name === name) as TextChannel;
  }

}
